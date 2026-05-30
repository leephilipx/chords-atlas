(function () {
  'use strict'
  if (window.__chordsInterceptLoaded) return
  window.__chordsInterceptLoaded = true

  var ORIGIN_HREF = window.__chordsOriginHref

  function resolveUrl(href) {
    if (!ORIGIN_HREF) return href
    try { return new URL(href, ORIGIN_HREF).href }
    catch (_) { return href }
  }

  document.addEventListener('click', function (e) {
    var link = e.target.closest('a')
    if (!link) return
    var href = link.getAttribute('href') || ''
    if (!href || href === '#' || href.startsWith('javascript:')) return
    if (link.target && link.target !== '_self') return

    var fullUrl = resolveUrl(href)

    try {
      var current = new URL(ORIGIN_HREF || location.href)
      var target = new URL(fullUrl)
      if (target.hostname === current.hostname &&
          target.pathname === current.pathname &&
          target.search === current.search) return
    } catch (_) {}

    e.preventDefault()
    e.stopPropagation()
    window.parent.postMessage({ type: 'chords-navigate', url: fullUrl }, '*')
  }, true)
})()
