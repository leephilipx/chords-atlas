; (function () {
  'use strict'

  var SECTION_RGX =
    /^(Verse\s*\d*|Chorus\s*\d*|Bridge\s*\d*|Prechorus\s*\d*|Postchorus\s*\d*|Intro|Outro|Tag|Interlude|Refrain|Rap|Instrumental|Ending)$/i

  // --- utilities (pnwchords uses a scrollable container, not window) ------

  function isVisible(el) {
    var rect = el.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) return false
    if (el.offsetParent === null && el.tagName !== 'BODY') return false
    var style = window.getComputedStyle(el)
    if (style.display === 'none' || style.visibility === 'hidden') return false
    return true
  }

  function getScrollTarget() {
    var se = document.scrollingElement
    if (se && se.scrollHeight > se.clientHeight) return se
    var el = document.body
    while (el) {
      var style = window.getComputedStyle(el)
      if ((style.overflowY === 'scroll' || style.overflowY === 'auto') && el.scrollHeight > el.clientHeight) {
        return el
      }
      el = el.parentElement
    }
    return document.documentElement
  }

  function getAbsoluteY(el) {
    var rect = el.getBoundingClientRect()
    var target = getScrollTarget()
    var scrollOffset = target.scrollTop || 0
    if (target === document.documentElement) {
      scrollOffset = window.pageYOffset || document.documentElement.scrollTop || 0
    }
    return rect.top + scrollOffset
  }

  // --- section finder -----------------------------------------------------

  window.__chordsFindSections = function () {
    var results = {}
    var candidates = document.querySelectorAll(
      'span[style*="font-weight:bold"], pre span[style*="bold"], b, strong'
    )
    candidates.forEach(function (el) {
      if (!isVisible(el)) return
      var text = (el.textContent || '').trim()
      if (SECTION_RGX.test(text)) {
        var y = getAbsoluteY(el)
        results[text] = Math.round(y)
      }
    })
    // fallback: scan all preformatted text for section names
    if (Object.keys(results).length === 0) {
      var pres = document.querySelectorAll('pre')
      pres.forEach(function (pre) {
        if (!isVisible(pre)) return
        if (Object.keys(results).length > 0) return
        var text = pre.textContent || ''
        var lines = text.split('\n')
        lines.forEach(function (line) {
          var trimmed = line.trim()
          if (SECTION_RGX.test(trimmed)) {
            var walker = document.createTreeWalker(pre, NodeFilter.SHOW_TEXT, null)
            var node
            while ((node = walker.nextNode())) {
              var idx = node.textContent.indexOf(trimmed)
              if (idx !== -1) {
                var range = document.createRange()
                range.setStart(node, idx)
                range.setEnd(node, idx)
                var rect = range.getClientRects()[0]
                if (rect) {
                  var y = rect.top + (window.pageYOffset || document.documentElement.scrollTop)
                  results[trimmed] = Math.round(y)
                }
                break
              }
            }
          }
        })
      })
    }
    return results
  }

  // --- scroll -------------------------------------------------------------

  window.__chordsHasContent = function () {
    return document.querySelectorAll('pre').length > 0 ||
      document.querySelectorAll('.tabcontent').length > 0
  }

  window.__chordsScrollTo = function (y) {
    var target = getScrollTarget()
    target.scrollTo({ top: y, behavior: 'smooth' })
    if (target !== document.documentElement) {
      window.scrollTo({ top: y, behavior: 'smooth' })
    }
  }

  window.__chordsScrollBy = function (dy) {
    var target = getScrollTarget()
    target.scrollBy({ top: dy, behavior: 'auto' })
    if (target !== document.documentElement) {
      window.scrollBy({ top: dy, behavior: 'auto' })
    }
  }
})()
