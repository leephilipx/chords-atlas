;(function () {
  'use strict'

  var R = window.__chordsSectionRegex

  function extractSectionNames() {
    var el = document.querySelector('.js-store')
    if (!el) return null
    var raw = el.getAttribute('data-content') || ''
    var decoded = raw.replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    try {
      var data = JSON.parse(decoded)
      var content =
        ((data.store || {}).page || {}).data ||
        {}
      var wiki = (content.tab_view || {}).wiki_tab || {}
      var text = wiki.content || ''
      if (!text) {
        text = (content.tab || {}).text || ''
      }
      var names = []
      var seen = {}
      var re = /\[([^\]]+)\]/g
      var m
      while ((m = re.exec(text)) !== null) {
        var name = m[1].trim()
        if (R.test(name) && !seen[name]) {
          seen[name] = true
          names.push(name)
        }
      }
      return names.length > 0 ? names : null
    } catch (_) {
      return null
    }
  }

  function isVisible(el) {
    var rect = el.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) return false
    var style = window.getComputedStyle(el)
    if (style.display === 'none' || style.visibility === 'hidden') return false
    return true
  }

  window.__chordsFindSections = function () {
    var knownNames = extractSectionNames()
    var results = {}
    var seen = {}

    var walker = document.createTreeWalker(
      document.body, NodeFilter.SHOW_TEXT,
      { acceptNode: function () { return NodeFilter.FILTER_ACCEPT } }
    )
    var node
    while ((node = walker.nextNode())) {
      var text = (node.textContent || '').trim()
      if (text.length < 3) continue

      var bracketRe = /\[([^\]]+)\]/g
      var match
      while ((match = bracketRe.exec(text)) !== null) {
        var name = match[1].trim()
        if (name.length > 60) continue
        if (!R.test(name)) continue
        if (knownNames && knownNames.indexOf(name) === -1) continue
        if (seen[name]) continue

        var parent = node.parentElement
        if (!parent || !isVisible(parent)) continue

        var range = document.createRange()
        try {
          range.setStart(node, match.index)
          range.setEnd(node, match.index + match[0].length)
        } catch (_) { continue }
        var rect = range.getClientRects()[0]
        if (!rect || rect.width < 20) continue

        seen[name] = true
        results[name] = Math.round(rect.top + window.pageYOffset)
      }
    }

    return results
  }

  window.__chordsScrollTo = function (y) {
    window.scrollTo({ top: y - 80, behavior: 'smooth' })
  }

  window.__chordsScrollBy = function (dy) {
    window.scrollBy({ top: dy, behavior: 'auto' })
  }
})()
