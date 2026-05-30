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
  var SCAN_DISABLED = false

  // --- resource URL patching ------------------------------------------------

  function resolveResourceUrl(url) {
    if (!url || typeof url !== 'string') return url
    if (url.indexOf('http://') === 0 || url.indexOf('https://') === 0 || url.indexOf('//') === 0) return url
    try { return new URL(url, ORIGIN_HREF).href }
    catch (_) { return url }
  }

  if (ORIGIN_HREF && ORIGIN_HREF !== location.href) {
    var _origFetch = window.fetch
    window.fetch = function (url, opts) {
      return _origFetch.call(this, resolveResourceUrl(url), opts)
    }

    var _origXHROpen = XMLHttpRequest.prototype.open
    XMLHttpRequest.prototype.open = function (method, url) {
      var args = [].slice.call(arguments)
      args[1] = resolveResourceUrl(args[1])
      return _origXHROpen.apply(this, args)
    }
  }

  window.__chordsSectionRegex =
    /^(Verse\s*\d*|Chorus\s*\d*|Bridge\s*\d*|Intro|Outro|Interlude|Refrain|Rap|Instrumental|Ending|Pre[\s-]?Chorus\s*\d*|Post[\s-]?Chorus\s*\d*)$/i

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
    } else if (msg.type === 'disable') {
      SCAN_DISABLED = true
    } else if (msg.type === 'enable') {
      SCAN_DISABLED = false
      SCAN_DONE = false
      scanSections()
    } else if (msg.type === 'rescan') {
      if (SCAN_DISABLED) return
      SCAN_DONE = false
      scanSections()
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

  // --- boot ---------------------------------------------------------------

  var started = false
  function boot() {
    if (started) return
    started = true
    if (typeof window.__chordsFindSections !== 'function') return
    window.parent.postMessage(
      { type: 'chords-ready', hostname: ORIGIN_HOSTNAME, href: ORIGIN_HREF },
      '*'
    )
  }

  if (document.readyState === 'complete') {
    boot()
  } else {
    window.addEventListener('load', function () {
      boot()
    })
  }
})()
