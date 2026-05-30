import { useState, useCallback, useRef, useEffect } from 'react'
import { Input, Button, Slider, Switch, Tooltip, App, Spin, Dropdown } from 'antd'
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  SearchOutlined,
  ReloadOutlined,
  LeftOutlined,
  RightOutlined,
  CaretDownOutlined,
} from '@ant-design/icons'
import { BACKEND_URL } from '../utils/constants'

type SectionPositions = Record<string, number>

const CHORD_PATH_PATTERNS = [
  'pnwchords.com',
  'worshiptogether.com/songs/',
  'tabs.ultimate-guitar.com/tab/',
]

function canUseScan(url: string): boolean {
  try {
    const s = url.toLowerCase()
    return CHORD_PATH_PATTERNS.some((p) => s.includes(p))
  } catch {
    return false
  }
}

function formatSectionName(name: string) {
  return name.replace(/([a-z])(\d)/i, '$1 $2')
}

function speedFormatter(v: number) {
  return `${v.toFixed(1)}x`
}

function getGoogleSearchUrl(query: string): string {
  return `https://www.google.com/search?igu=1&q=${encodeURIComponent(query)}`
}

function displayUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname + u.pathname
  } catch {
    return url
  }
}

export default function ChordBrowser() {
  const [url, setUrl] = useState('')
  const [proxyUrl, setProxyUrl] = useState(() => {
    const googleUrl = 'https://www.google.com/webhp?igu=1'
    return `${BACKEND_URL}/__proxy?url=${encodeURIComponent(googleUrl)}&scan=0&_t=${Date.now()}`
  })
  const [sections, setSections] = useState<SectionPositions>({})
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [autoScroll, setAutoScroll] = useState(false)
  const [scrollSpeed, setScrollSpeed] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [loading, setLoading] = useState(false)
  const [iframeReady, setIframeReady] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)
  const [scanEnabled, setScanEnabled] = useState(true)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const sectionsRef = useRef<SectionPositions>({})
  const targetUrlRef = useRef('https://www.google.com/webhp?igu=1')
  const scanEnabledRef = useRef(true)
  const historyRef = useRef<string[]>(['https://www.google.com/webhp?igu=1'])
  const historyIdxRef = useRef(0)
  const skipPushRef = useRef(false)
  const { message } = App.useApp()

  sectionsRef.current = sections
  scanEnabledRef.current = scanEnabled

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const postToIframe = useCallback((msg: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage(
      { ...msg, source: 'chords-atlas' },
      '*'
    )
  }, [])

  const navigateTo = useCallback((targetUrl: string) => {
    let resolvedUrl = targetUrl
    try {
      resolvedUrl = new URL(targetUrl, targetUrlRef.current).href
    } catch {
      resolvedUrl = targetUrl
    }
    if (!skipPushRef.current) {
      historyRef.current = historyRef.current.slice(0, historyIdxRef.current + 1)
      historyRef.current.push(resolvedUrl)
      historyIdxRef.current = historyRef.current.length - 1
    }
    skipPushRef.current = false
    targetUrlRef.current = resolvedUrl
    setSections({})
    setActiveSection(null)
    setAutoScroll(false)
    setIframeReady(false)
    setUrl(resolvedUrl)
    const doScan = canUseScan(resolvedUrl) && scanEnabledRef.current
    setLoading(doScan)
    const proxied = `${BACKEND_URL}/__proxy?url=${encodeURIComponent(resolvedUrl)}&scan=${doScan ? '1' : '0'}&_t=${Date.now()}`
    setProxyUrl(proxied)
  }, [])

  const handleLoad = useCallback(() => {
    const input = url.trim()
    if (!input) return

    let targetUrl: string
    try {
      new URL(input)
      targetUrl = input
    } catch {
      targetUrl = getGoogleSearchUrl(input)
    }

    navigateTo(targetUrl)
  }, [url, navigateTo])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleLoad()
    },
    [handleLoad]
  )

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!e.data) return
      if (e.data.type === 'chords-ready') {
        setIframeReady(true)
        return
      }
      if (e.data.type === 'chords-sections') {
        const incoming = e.data.sections as SectionPositions
        const names = Object.keys(incoming)
        if (names.length > 0) {
          setSections(incoming)
          setLoading(false)
          message.success(`Found ${names.length} sections`)
        }
        return
      }
      if (e.data.type === 'chords-navigate') {
        navigateTo(e.data.url)
        return
      }
    }
    window.addEventListener('message', handler)
    return () => {
      window.removeEventListener('message', handler)
    }
  }, [message, navigateTo])

  useEffect(() => {
    if (!iframeReady) return
    postToIframe({ type: 'enable' })
    let count = 0
    const interval = setInterval(() => {
      count++
      postToIframe({ type: 'rescan' })
      if (Object.keys(sectionsRef.current).length > 0) {
        clearInterval(interval)
        setLoading(false)
      }
      if (count > 5) {
        clearInterval(interval)
        setLoading(false)
        if (Object.keys(sectionsRef.current).length === 0) {
          message.warning('No song sections detected on this page')
        }
      }
    }, 500)
    return () => {
      clearInterval(interval)
    }
  }, [iframeReady, postToIframe, message])

  useEffect(() => {
    if (targetUrlRef.current === 'https://www.google.com/webhp?igu=1') return
    const targetUrl = targetUrlRef.current
    const doScan = canUseScan(targetUrl) && scanEnabled
    setSections({})
    setActiveSection(null)
    setAutoScroll(false)
    setIframeReady(false)
    setLoading(doScan)
    const proxied = `${BACKEND_URL}/__proxy?url=${encodeURIComponent(targetUrl)}&scan=${doScan ? '1' : '0'}&_t=${Date.now()}`
    setProxyUrl(proxied)
  }, [scanEnabled])

  const handleSectionClick = useCallback(
    (name: string, y: number) => {
      setActiveSection(name)
      postToIframe({ type: 'scrollTo', y })
    },
    [postToIframe]
  )

  const handleAutoScrollToggle = useCallback(() => {
    const next = !autoScroll
    postToIframe({ type: 'setAutoScroll', speed: next ? scrollSpeed : 0 })
    setAutoScroll(next)
  }, [autoScroll, scrollSpeed, postToIframe])

  const handleSpeedChange = useCallback(
    (value: number) => {
      setScrollSpeed(value)
      if (autoScroll) {
        postToIframe({ type: 'setAutoScroll', speed: value })
      }
    },
    [autoScroll, postToIframe]
  )

  const handleZoomIn = useCallback(() => {
    setZoom((z) => {
      const newZoom = Math.min(z + 0.1, 2.5)
      postToIframe({ type: 'setZoom', level: newZoom })
      return newZoom
    })
  }, [postToIframe])

  const handleZoomOut = useCallback(() => {
    setZoom((z) => {
      const newZoom = Math.max(z - 0.1, 0.3)
      postToIframe({ type: 'setZoom', level: newZoom })
      return newZoom
    })
  }, [postToIframe])

  const handleIframeLoad = useCallback(() => {
    try {
      const href = iframeRef.current?.contentWindow?.location?.href
      if (!href || href.startsWith(BACKEND_URL) || href === targetUrlRef.current) return
      const prev = targetUrlRef.current
      targetUrlRef.current = href
      setUrl(href)
      if (canUseScan(prev) && scanEnabledRef.current) {
        navigateTo(prev)
        return
      }
      navigateTo(href)
    } catch (_) {}
  }, [navigateTo])

  const handleRefresh = useCallback(() => {
    setSections({})
    setActiveSection(null)
    setIframeReady(false)
    const targetUrl = targetUrlRef.current
    const doScan = canUseScan(targetUrl) && scanEnabledRef.current
    setLoading(doScan)
    const proxied = `${BACKEND_URL}/__proxy?url=${encodeURIComponent(targetUrl)}&scan=${doScan ? '1' : '0'}&_t=${Date.now()}`
    setProxyUrl(proxied)
  }, [])

  const goBack = useCallback(() => {
    if (historyIdxRef.current > 0) {
      historyIdxRef.current--
      skipPushRef.current = true
      navigateTo(historyRef.current[historyIdxRef.current])
    }
  }, [navigateTo])

  const goForward = useCallback(() => {
    if (historyIdxRef.current < historyRef.current.length - 1) {
      historyIdxRef.current++
      skipPushRef.current = true
      navigateTo(historyRef.current[historyIdxRef.current])
    }
  }, [navigateTo])

  const jumpToHistory = useCallback((targetUrl: string) => {
    const idx = historyRef.current.indexOf(targetUrl)
    if (idx < 0) return
    historyIdxRef.current = idx
    skipPushRef.current = true
    navigateTo(targetUrl)
  }, [navigateTo])

  const hasSections = Object.keys(sections).length > 0

  const controls = hasSections ? (
    <div style={{
      padding: '2px 8px', background: '#001529', display: 'flex',
      alignItems: 'center', justifyContent: 'center', gap: 4, flexWrap: 'wrap', zIndex: 10
    }}>
      <Tooltip title={autoScroll ? 'Pause' : 'Auto-scroll'}>
        <Button
          size="small"
          icon={autoScroll ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
          onClick={handleAutoScrollToggle}
          type={autoScroll ? 'primary' : 'default'}
          danger={autoScroll}
        />
      </Tooltip>

      <div style={{ width: isMobile ? 160 : 200 }}>
        <Slider
          min={0.5}
          max={5}
          step={0.1}
          value={scrollSpeed}
          onChange={handleSpeedChange}
          tooltip={{ formatter: (v) => v !== undefined ? speedFormatter(v) : undefined }}
        />
      </div>
      <span style={{ color: '#ffffffaa', fontSize: 11, minWidth: 30, textAlign: 'center' }}>
        {speedFormatter(scrollSpeed)}
      </span>

      <div style={{ width: 1, height: 24, background: '#ffffff33', margin: '0 2px', flexShrink: 0 }} />

      <Tooltip title="Zoom in">
        <Button size="small" icon={<ZoomInOutlined />} onClick={handleZoomIn} />
      </Tooltip>
      <span style={{ color: '#ffffffaa', fontSize: 12, minWidth: 34, textAlign: 'center' }}>
        {Math.round(zoom * 100)}%
      </span>
      <Tooltip title="Zoom out">
        <Button size="small" icon={<ZoomOutOutlined />} onClick={handleZoomOut} />
      </Tooltip>

      <Tooltip title="Reload">
        <Button size="small" icon={<ReloadOutlined />} onClick={handleRefresh} />
      </Tooltip>
    </div>
  ) : null

  const sectionRow = hasSections ? (
    <div
      style={{
        padding: isMobile ? '10px 10px' : '10px 16px',
        background: '#002140',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isMobile ? 'center' : 'flex-start',
        gap: 5,
        flexWrap: 'wrap',
        borderBottom: '1px solid #ffffff12',
      }}
    >
      {Object.entries(sections).map(([name, y]) => (
        <Button
          key={name}
          type={activeSection === name ? 'primary' : 'default'}
          size="small"
          onClick={() => handleSectionClick(name, y)}
        >
          {formatSectionName(name)}
        </Button>
      ))}
    </div>
  ) : null

  const backHistory = historyRef.current.slice(0, historyIdxRef.current).reverse()
  const forwardHistory = historyRef.current.slice(historyIdxRef.current + 1)

  function makeHistoryItems(urls: string[]) {
    return urls.map((u) => ({ key: u, label: <span style={{ fontSize: 12 }}>{displayUrl(u)}</span> }))
  }

  const backDisabled = historyIdxRef.current === 0
  const forwardDisabled = historyIdxRef.current >= historyRef.current.length - 1

  function navButton(
    icon: React.ReactNode,
    onClick: () => void,
    disabled: boolean,
    historyUrls: string[],
    isFirst: boolean,
  ) {
    const btn = (
      <Button size="small" icon={icon} onClick={onClick} disabled={disabled}
        style={{ minWidth: 28, padding: '0 4px',
          ...(isFirst
            ? { borderTopRightRadius: 0, borderBottomRightRadius: 0 }
            : { borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeft: 0 }),
        }} />
    )
    if (historyUrls.length === 0) return btn
    return (
      <div style={{ display: 'flex', gap: 0, flexShrink: 0 }}>
        {btn}
        <Dropdown menu={{ items: makeHistoryItems(historyUrls), onClick: ({ key }) => jumpToHistory(key) }} trigger={['click']}>
          <Button size="small" disabled={disabled}
            style={{ minWidth: 12, padding: '0 2px',
              ...(isFirst
                ? { borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeft: 0 }
                : { borderTopRightRadius: 0, borderBottomRightRadius: 0 }),
            }}>
            <CaretDownOutlined style={{ fontSize: 10 }} />
          </Button>
        </Dropdown>
      </div>
    )
  }

  const backBtn = navButton(<LeftOutlined />, goBack, backDisabled, backHistory, true)
  const forwardBtn = navButton(<RightOutlined />, goForward, forwardDisabled, forwardHistory, false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {isMobile ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', padding: '6px 10px', background: '#001529', gap: 6, zIndex: 10 }}>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              {backBtn}
              {forwardBtn}
            </div>
            <Input
              placeholder="Search Google or enter chord URL ..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{ flex: 1 }}
              prefix={<SearchOutlined />}
              allowClear
              suffix={loading ? <Spin size="small" /> : undefined}
            />
            <Button type="primary" onClick={handleLoad} loading={loading} style={{ flexShrink: 0 }}>
              Go
            </Button>
            <Tooltip title={scanEnabled ? 'Disable auto-scan' : 'Enable auto-scan'}>
              <Switch size="small" checked={scanEnabled} onChange={setScanEnabled} />
            </Tooltip>
          </div>
          {controls}
          {sectionRow}
        </>
      ) : (
        <>
          <div
            style={{
              padding: '8px 16px',
              background: '#001529',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              zIndex: 10,
            }}
          >
            <div style={{ display: 'flex', gap: 8, flex: 1, minWidth: 0, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              {backBtn}
              {forwardBtn}
            </div>
            <Input
                placeholder="Search Google or enter chord URL ..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{ flex: 1 }}
                prefix={<SearchOutlined />}
                allowClear
                suffix={loading ? <Spin size="small" /> : undefined}
              />
              <Button type="primary" onClick={handleLoad} loading={loading}>
                Go
              </Button>
              <div style={{ width: 1, height: 24, background: '#ffffff33', flexShrink: 0 }} />
              <Tooltip title={scanEnabled ? 'Disable auto-scan' : 'Enable auto-scan'}>
                <Switch size="small" checked={scanEnabled} onChange={setScanEnabled} />
              </Tooltip>
            </div>
            {hasSections && <div style={{ width: 1, height: 24, background: '#ffffff33', flexShrink: 0 }} />}
            {controls}
          </div>
          {sectionRow}
        </>
      )}

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#1a1a1a' }}>
        {loading && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 5,
              textAlign: 'center',
            }}
          >
            <Spin size="large" />
            <div style={{ color: '#999', marginTop: 12 }}>
              Loading and scanning for sections ...
            </div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={proxyUrl || undefined}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            opacity: loading ? 0.4 : 1,
            transition: 'opacity 0.3s',
          }}
          onLoad={handleIframeLoad}
          title="chords-viewer"
          sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
        />
      </div>
    </div>
  )
}
