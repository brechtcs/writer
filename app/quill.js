var Quill = require('quill')

var component = require('nanocomponent')
var html = require('choo/html')

module.exports = function nanoquill (opts, cb) {
  var quill

  return component({
    render: function () {
      return html`<div class="ql-component">
        <article></article>
      </div>`
    },
    onload: function (el) {
      quill = new Quill(el.querySelector('article'), opts)
      cb(quill)
    },
    onunload: function (el) {
      quill = null
    },
    onupdate: function (el, delta) {
      quill.setContents(delta)
    }
  })
}
