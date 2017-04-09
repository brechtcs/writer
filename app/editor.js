var editor = null
var quill = null

var Delta = require('quill-delta')
var css = require('sheetify')
var html = require('choo/html')
var nanoquill = require('./quill')
var socket = require('./socket')

css('quill/dist/quill.bubble.css')

module.exports.display = function (state, emit) {
  if (!quill) {
    quill = nanoquill({
      modules: {toolbar: [
        ['bold', 'italic', 'strike'],
        [{'list': 'ordered'}, {'list': 'bullet'}, 'blockquote'],
        ['image', 'link'],
        ['clean']
      ]},
      placeholder: 'Post body...',
      theme: 'bubble'
    }, function (quill) {
      editor = quill
      editor.setContents(state.entry.content)
      editor.on('text-change', function (delta, prev, source) {
        emit('body:update', {delta: delta, source: source})
      })
    })
  }

  return html`
    <body>
      <header>Editor</header>
      <main>${quill(state.entry.content)}</main>
    </body>
  `
}

module.exports.listen = function (state, bus) {
  state.entry = {}

  bus.on('body:update', function (update) {
    state.entry.content = state.entry.content.compose(update.delta)

    if (update.source === 'user') {
      socket.emit('editor', {type: 'PATCH', key: state.params.wildcard, update: {delta: update.delta, deleted: false}})
    }
    else if (update.source === 'api') {
      editor.updateContents(update.delta, 'silent')
    }
  })

  bus.on('pushState', function () {
    state.loading = true

    setTimeout(function () {
      state.loading = false
      bus.emit('render') //workaround for params timing issue
    }, 150)
  })

  bus.on('render', function () {
    if (state.params.wildcard) {
      socket.emit('editor', {type: 'GET', key: state.params.wildcard})
    }
  })

  socket.on('editor', function (data) {
    if (data.key === state.params.wildcard) {
      if (data.entry) {
        state.entry = data.entry
        state.entry.content = new Delta(data.entry.content)
        editor.setContents(data.entry.content, 'silent')
      }
      else if (data.update) {
        data.update.source = 'api'
        bus.emit('body:update', data.update)
      }
    }
  })
}
