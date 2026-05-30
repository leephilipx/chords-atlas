; (function () {
  'use strict'

  var R = window.__chordsSectionRegex

  // --- utilities (worshipTogether uses simple window scrolling) ------------

  function isVisible(el) {
    var rect = el.getBoundingClientRect()
    return !(rect.width === 0 && rect.height === 0)
  }

  function getAbsoluteY(el) {
    var rect = el.getBoundingClientRect()
    return rect.top + (window.pageYOffset || document.documentElement.scrollTop || 0)
  }

  // --- section finder -----------------------------------------------------

  window.__chordsFindSections = function () {
    var results = {}
    var lines = document.querySelectorAll('.chord-pro-line')
    lines.forEach(function (line) {
      if (!isVisible(line)) return
      var lyricEl = line.querySelector('.chord-pro-lyric')
      if (!lyricEl) return
      var noteEl = line.querySelector('.chord-pro-note')
      var noteText = (noteEl && noteEl.textContent || '').trim()
      if (noteText !== '' && noteText !== '\u00A0') return
      var name = (lyricEl.textContent || '').trim()
      if (R.test(name)) {
        var y = getAbsoluteY(line)
        results[name] = Math.round(y)
      }
    })
    return results
  }

  // --- scroll -------------------------------------------------------------

  window.__chordsHasContent = function () {
    return document.querySelectorAll('.chord-pro-line').length > 0
  }

  window.__chordsScrollTo = function (y) {
    window.scrollTo({ top: y, behavior: 'smooth' })
  }

  window.__chordsScrollBy = function (dy) {
    window.scrollBy({ top: dy, behavior: 'auto' })
  }
})()
