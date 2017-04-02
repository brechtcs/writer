const Quill = require('quill')

const component = require('nanocomponent')
const html = require('choo/html')

module.exports = function nanoquill (opts, cb) {
  let quill

  return component({
    render: function () {
      return html`<main>
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
