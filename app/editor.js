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
        [{'align': []}],
        ['image', 'link'],
        ['clean']
      ]},
      placeholder: 'Post body...',
      theme: 'bubble'
    }, function (quill) {
      editor = quill
      editor.setContents(state.content)
      editor.on('text-change', function (delta, prev, source) {
        emit('body:update', {delta: delta, source: source})
      })
    })
  }

  return html`
    <body>
      <header>
        <h1>Editor</h1>
        <svg viewBox="0 0 50 50">
          <path d="M36,3v8.467c0.619-0.36,1.286-0.748,2-1.163V3H36z M22.546,18.871c-0.018-0.015-0.035-0.028-0.054-0.043  c-0.34-0.271-0.699-0.52-1.081-0.74c-0.032-0.02-5.7-3.314-7.411-4.309v-0.01c-0.738-0.429-1.421-0.826-1.982-1.152v9.259  l0.028,0.171c0.035,0.522,0.132,1.033,0.255,1.537c0.277,1.138,0.775,2.211,1.441,3.163c0.062,0.089,0.122,0.179,0.188,0.265  c0.117,0.156,0.243,0.306,0.37,0.454c0.106,0.124,0.216,0.246,0.33,0.365c0.113,0.118,0.229,0.235,0.348,0.348  c0.153,0.144,0.314,0.28,0.478,0.413c0.099,0.081,0.194,0.165,0.297,0.242c0.276,0.205,0.562,0.4,0.861,0.573L24,33.675V20.646  h0.009v-0.247C23.578,19.84,23.099,19.318,22.546,18.871z M31.166,14.276c0.259-0.149,0.537-0.312,0.834-0.484V7h-2v7.955  c0.23-0.135,0.483-0.281,0.76-0.442C30.889,14.438,31.027,14.357,31.166,14.276z M28.604,18.08c-0.016,0.009-0.029,0.02-0.045,0.029  c-0.323,0.189-0.627,0.404-0.921,0.63c-0.087,0.066-0.173,0.134-0.257,0.204c-0.006,0.004-0.012,0.008-0.017,0.013  c-0.279,0.232-0.546,0.478-0.793,0.74c-0.082,0.087-0.157,0.184-0.236,0.274c-0.114,0.131-0.22,0.27-0.326,0.407V33.68l7.396-4.272  c0.3-0.173,0.585-0.368,0.861-0.573c0.102-0.077,0.197-0.161,0.297-0.242c0.163-0.133,0.324-0.27,0.478-0.413  c0.12-0.112,0.234-0.229,0.348-0.348c0.114-0.119,0.224-0.241,0.33-0.365c0.127-0.148,0.253-0.298,0.37-0.454  c0.065-0.086,0.125-0.176,0.188-0.265c0.666-0.952,1.164-2.025,1.441-3.163c0.123-0.504,0.22-1.015,0.255-1.537L38,21.802v-9.185  c-1.04,0.604-2.493,1.449-3.946,2.294C31.364,16.476,28.674,18.039,28.604,18.08z M20,14.943V7h-2v6.781  c0.11,0.064,0.221,0.129,0.326,0.189C18.975,14.348,19.542,14.678,20,14.943z M14,3h-2v7.293c0.714,0.416,1.381,0.803,2,1.163V3z   M26,1h-2v16h2V1z M14.538,30.429c-0.257-0.19-0.494-0.401-0.731-0.611c-0.071-0.063-0.148-0.12-0.218-0.186  c-0.295-0.275-0.569-0.567-0.832-0.871c-0.002-0.003-0.005-0.006-0.008-0.009c-0.268-0.311-0.514-0.636-0.745-0.973  c-0.001-0.002-0.003-0.003-0.004-0.005v9.654l0.009,0.277l0.008,0.014c0.133,3.129,1.87,6.016,4.579,7.58L24,49.577V35.984  l-8.387-4.845C15.238,30.923,14.88,30.685,14.538,30.429z M36.414,29.644c-0.065,0.062-0.139,0.116-0.206,0.176  c-0.238,0.211-0.477,0.423-0.734,0.613c-0.34,0.255-0.696,0.491-1.069,0.707l-8.396,4.85v1.155L26,37.14v12.438l7.404-4.277  c2.709-1.564,4.446-4.451,4.579-7.58l0.011-9.913c0,0,0,0.001-0.001,0.001C37.535,28.473,37.011,29.09,36.414,29.644z" />
        </svg>
      </header>
      <main>${quill(state.content)}</main>
    </body>
  `
}

module.exports.listen = function (state, bus) {
  state.entry = {}

  bus.on('body:update', function (update) {
    state.content = state.content.compose(update.delta)

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
        state.content = new Delta(data.content)
        editor.setContents(data.content, 'silent')
      }
      else if (data.update) {
        data.update.source = 'api'
        bus.emit('body:update', data.update)
      }
    }
  })
}
