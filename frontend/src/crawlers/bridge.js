(function () {
  'use strict'
  if (window.__chordsBridgeLoaded) return
  window.__chordsBridgeLoaded = true

  var ORIGIN_HOSTNAME = window.__chordsOriginHostname || location.hostname
  var ORIGIN_HREF = window.__chordsOriginHref || location.href

  var AUTO_SCROLL = null
  var AUTO_SCROLL_SPEED = 1
  var AUTO_SCROLL_PAUSED = false
  var SCAN_DONE = false

  // --- message handling ---------------------------------------------------

  window.addEventListener('message', function (e) {
    var msg = e.data
    if (!msg || msg.source !== 'chords-atlas') return

    if (msg.type === 'scrollTo') {
      if (typeof window.__chordsScrollTo !== 'function') return
      if (AUTO_SCROLL) {
        AUTO_SCROLL_PAUSED = true
      }
      window.__chordsScrollTo(msg.y - 60)
      if (AUTO_SCROLL) {
        var resumeSpeed = AUTO_SCROLL_SPEED
        setTimeout(function () {
          if (AUTO_SCROLL && AUTO_SCROLL_SPEED === resumeSpeed) {
            AUTO_SCROLL_PAUSED = false
          }
        }, 1500)
      }
    } else if (msg.type === 'setAutoScroll') {
      if (typeof window.__chordsScrollBy !== 'function') return
      AUTO_SCROLL_SPEED = msg.speed || 1
      AUTO_SCROLL_PAUSED = false
      if (AUTO_SCROLL) clearInterval(AUTO_SCROLL)
      if (msg.speed > 0) {
        AUTO_SCROLL = setInterval(function () {
          if (!AUTO_SCROLL_PAUSED) {
            window.__chordsScrollBy(AUTO_SCROLL_SPEED)
          }
        }, 50)
      }
    } else if (msg.type === 'pauseScroll') {
      AUTO_SCROLL_PAUSED = true
    } else if (msg.type === 'resumeScroll') {
      AUTO_SCROLL_PAUSED = false
    } else if (msg.type === 'setZoom') {
      document.body.style.zoom = String(msg.level)
    } else if (msg.type === 'rescan') {
      if (!SCAN_DONE) scanSections()
    }
  })

  // --- scanning -----------------------------------------------------------

  function scanSections() {
    if (typeof window.__chordsFindSections !== 'function') return
    try {
      var sections = window.__chordsFindSections()
      if (Object.keys(sections).length > 0) {
        SCAN_DONE = true
        window.parent.postMessage(
          { type: 'chords-sections', sections: sections, hostname: ORIGIN_HOSTNAME },
          '*'
        )
      }
    } catch (err) {
      // ignore
    }
  }

  // --- link interception ------------------------------------------------

  document.addEventListener('click', function (e) {
    var link = e.target.closest('a')
    if (!link || !link.href) return
    var href = link.getAttribute('href') || ''
    if (!href || href === '#' || href.startsWith('javascript:')) return
    if (link.target && link.target !== '_self') return

    try {
      var current = new URL(location.href)
      var target = new URL(link.href)
      // Don't intercept same-page anchor links
      if (target.hostname === current.hostname &&
          target.pathname === current.pathname &&
          target.search === current.search) return
    } catch (_) { /* ignore malformed URLs */ }

    e.preventDefault()
    e.stopPropagation()
    window.parent.postMessage({ type: 'chords-navigate', url: link.href }, '*')
  }, true)

  // --- boot ---------------------------------------------------------------

  var started = false
  function boot() {
    if (started) return
    started = true
    window.parent.postMessage(
      { type: 'chords-ready', hostname: ORIGIN_HOSTNAME, href: ORIGIN_HREF },
      '*'
    )

    // No domain finder registered — nothing to scan, stop immediately
    if (typeof window.__chordsFindSections !== 'function') return

    function startScanLoop() {
      var tries = 0
      function tryScan() {
        if (SCAN_DONE) return
        tries++
        scanSections()
        if (!SCAN_DONE && tries < 6) {
          setTimeout(tryScan, 300)
        }
      }
      setTimeout(tryScan, 0)
    }

    // If the domain provides a content gate, wait for it first
    if (typeof window.__chordsHasContent === 'function') {
      var contentTries = 0
      function waitForContent() {
        if (SCAN_DONE) return
        contentTries++
        if (window.__chordsHasContent()) {
          startScanLoop()
          return
        }
        if (contentTries < 4) {
          setTimeout(waitForContent, 300)
        }
      }
      setTimeout(waitForContent, 500)
    } else {
      startScanLoop()
    }
  }

  if (document.readyState === 'complete') {
    boot()
  } else {
    window.addEventListener('load', function () {
      boot()
    })
  }
})()
