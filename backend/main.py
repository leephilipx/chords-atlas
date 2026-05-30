import os
import re
from pathlib import Path
from urllib.parse import urlparse

import httpx
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse

BASE_DIR = Path(__file__).resolve().parent

with open(BASE_DIR / "proxy" / "bridge.js") as f:
    SHARED_BRIDGE = f.read()

with open(BASE_DIR / "proxy" / "intercept.js") as f:
    INTERCEPT_SCRIPT = f.read()

with open(BASE_DIR / "proxy" / "ug-url-fix.js") as f:
    UG_URL_FIX = f.read()

_DOMAIN_PATTERNS = [
    ("pnwchords.com", "pnwchords.js"),
    ("worshiptogether.com/songs/", "worshiptogether.js"),
    ("tabs.ultimate-guitar.com/tab/", "ultimate-guitar.js"),
]

DOMAIN_BRIDGES: dict[str, str] = {}
for pattern, filename in _DOMAIN_PATTERNS:
    path = BASE_DIR / "proxy" / filename
    if path.exists():
        DOMAIN_BRIDGES[pattern] = path.read_text()

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

app = FastAPI(title="Chords Atlas Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _get_domain_bridge(url: str) -> str:
    url_lower = url.lower()
    for pattern, script in DOMAIN_BRIDGES.items():
        if pattern in url_lower:
            return script
    return ""


_BLOCK_HEADERS = {"x-frame-options", "content-security-policy", "x-content-type-options",
                  "content-length", "transfer-encoding", "content-encoding"}


def _safe_headers(response) -> dict:
    try:
        return {
            k: v
            for k, v in response.headers.items()
            if k.lower() not in _BLOCK_HEADERS
        }
    except Exception:
        return {}


@app.get("/__proxy")
async def proxy(
    url: str = Query(..., description="Target URL to proxy"),
    scan: str = Query("0", description="Inject bridge scripts: 1 or 0"),
):
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(
                url,
                headers={"User-Agent": USER_AGENT},
                follow_redirects=True,
            )
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"Proxy request failed: {e}")

    content_type = response.headers.get("content-type", "")

    if "text/html" in content_type:
        try:
            html = response.text
        except Exception:
            html = await response.aread()
            html = html.decode("utf-8", errors="replace")

        final_url = str(response.url)
        parsed = urlparse(final_url)
        target_origin = f"{parsed.scheme}://{parsed.netloc}"
        target_hostname = parsed.hostname or ""

        origin_script = (
            "<script>"
            f'window.__chordsOriginHostname="{target_hostname}";'
            f'window.__chordsOriginHref="{final_url}";'
            "</script>"
        )
        shared_tag = f"<script data-chords-bridge>{SHARED_BRIDGE}</script>"
        domain_script = _get_domain_bridge(final_url)
        is_chord = bool(domain_script)
        domain_tag = (
            f"<script data-chords-domain-bridge>{domain_script}</script>"
            if domain_script
            else ""
        )
        is_ug = "tabs.ultimate-guitar.com" in target_hostname
        base_tag = f'<base href="{target_origin}/">'
        if is_ug:
            base_tag = base_tag + f"<script data-chords-url-fix>{UG_URL_FIX}</script>"
        intercept_tag = (
            f"<script data-chords-intercept>{INTERCEPT_SCRIPT}</script>"
        )

        script_block = f"{origin_script}{intercept_tag}" + (
            f"{shared_tag}{domain_tag}" if scan == "1" and is_chord else ""
        )

        html = html.replace("<head>", f"<head>{base_tag}")
        html = html.replace(
            "</head>", f"{script_block}</head>"
        )

        if "pnwchords.com" in target_hostname:
            html = re.sub(
                r'<script[^>]*(?:google.*(?:analytics|tagmanager|gtag)|id=["\'](?:google_gtagjs|google-analytics))[^>]*>[\s\S]*?</script>',
                '',
                html,
                flags=re.IGNORECASE,
            )

        if "tabs.ultimate-guitar.com" in target_hostname:
            def _rewrite_ug_url(m):
                attr = m.group(1)
                quote = m.group(2)
                path = m.group(3)
                return f'{attr}={quote}{target_origin}{path}{quote}'
            html = re.sub(
                r'(src|href)=(["\'])(/(?!/)[^"\']*)\2',
                _rewrite_ug_url,
                html,
                flags=re.IGNORECASE,
            )

        return HTMLResponse(content=html, status_code=200)

    return StreamingResponse(
        response.aiter_bytes(),
        status_code=response.status_code,
        headers={"Content-Type": content_type, **_safe_headers(response)},
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8080")))
