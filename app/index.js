var choo = require('choo')
var html = require('choo/html')

var auth = require('./auth')
var overview = require('./overview')
var editor = require('./editor')

var app = choo()

app.use(function (state, bus) {
  if (process.env.NODE_ENV !== 'production') {
    bus.on('*', console.info)

    window.bus = bus
    window.state = state
  }
})

app.use(overview.listen)
app.use(editor.listen)

app.route('/', auth.display)
app.route('/overview', overview.display)
app.route('/*', editor.display)

module.exports = app
