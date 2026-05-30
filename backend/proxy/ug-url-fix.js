;(function () {
  'use strict'

  var UG = window.__chordsOriginHostname
    ? 'https://' + window.__chordsOriginHostname
    : 'https://tabs.ultimate-guitar.com'

  function resolveUrl(url) {
    if (!url || typeof url !== 'string') return url
    if (/^(https?:)?\/\//.test(url)) return url
    if (url.indexOf('/') === 0) return UG + url
    return url
  }

  function fixCssText(css) {
    if (!css || typeof css !== 'string') return css
    return css.replace(/url\((['"]?)(\/[^)'"]*?)\1\)/g, function (_, q, u) {
      return 'url(' + q + resolveUrl(u) + q + ')'
    })
  }

  var URL_PROPS = { href: 1, src: 1, srcset: 1, action: 1, data: 1 }

  var _setAttr = Element.prototype.setAttribute
  Element.prototype.setAttribute = function (name, value) {
    if (name in URL_PROPS) {
      value = resolveUrl(value)
    }
    return _setAttr.call(this, name, value)
  }

  function interceptProp(proto, prop) {
    try {
      var desc = Object.getOwnPropertyDescriptor(proto, prop)
      if (!desc || !desc.set) return
      var origSet = desc.set
      Object.defineProperty(proto, prop, {
        get: desc.get,
        set: function (val) { origSet.call(this, resolveUrl(val)) },
        configurable: true,
      })
    } catch (_) {}
  }

  interceptProp(HTMLLinkElement.prototype, 'href')
  interceptProp(HTMLImageElement.prototype, 'src')
  interceptProp(HTMLScriptElement.prototype, 'src')
  interceptProp(HTMLSourceElement.prototype, 'src')
  interceptProp(HTMLIFrameElement.prototype, 'src')
  interceptProp(HTMLVideoElement.prototype, 'src')
  interceptProp(HTMLAudioElement.prototype, 'src')
  interceptProp(HTMLObjectElement.prototype, 'data')
  interceptProp(HTMLEmbedElement.prototype, 'src')

  try {
    var _insertRule = CSSStyleSheet.prototype.insertRule
    CSSStyleSheet.prototype.insertRule = function (rule, index) {
      return _insertRule.call(this, fixCssText(rule), index)
    }
  } catch (_) {}

  try {
    var _addRule = CSSStyleSheet.prototype.addRule
    CSSStyleSheet.prototype.addRule = function (selector, style, index) {
      return _addRule.call(this, selector, fixCssText(style), index)
    }
  } catch (_) {}

  try {
    var textDesc = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent')
    if (textDesc && textDesc.set) {
      var _tcSet = textDesc.set
      Object.defineProperty(HTMLStyleElement.prototype, 'textContent', {
        get: textDesc.get,
        set: function (val) { _tcSet.call(this, fixCssText(val)) },
        configurable: true,
      })
    }
  } catch (_) {}

  var styleProto = CSSStyleDeclaration.prototype
  if (styleProto) {
    var _origSetProp = styleProto.setProperty
    if (_origSetProp) {
      CSSStyleDeclaration.prototype.setProperty = function (prop, value) {
        if (value && typeof value === 'string') value = fixCssText(value)
        return _origSetProp.call(this, prop, value)
      }
    }

    try {
      var cssTextDesc = Object.getOwnPropertyDescriptor(styleProto, 'cssText')
      if (cssTextDesc && cssTextDesc.set) {
        var _origCssText = cssTextDesc.set
        Object.defineProperty(styleProto, 'cssText', {
          get: cssTextDesc.get,
          set: function (val) { _origCssText.call(this, fixCssText(val)) },
          configurable: true,
        })
      }
    } catch (_) {}
  }

  try {
    if (navigator.serviceWorker && navigator.serviceWorker.register) {
      var _origRegister = navigator.serviceWorker.register.bind(navigator.serviceWorker)
      navigator.serviceWorker.register = function (url, opts) {
        return _origRegister(resolveUrl(url), opts)
      }
    }
  } catch (_) {}
})()
