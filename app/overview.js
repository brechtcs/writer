var html = require('choo/html')
var socket = require('./socket')

module.exports.display = function (state, emit) {
  return html`
    <body>
      <header>Overview</header>
      <main>
        <nav>
          <ul>${state.all.map(item)}</ul>
        </nav>
      </main>
    </body>
  `

  function item (entry) {
    return html`
      <li>
        <a href=${entry}>${entry}</a>
      </li>
    `
  }
}

module.exports.listen = function (state, bus) {
  state.all = []

  socket.emit('overview', {type: 'GET'})
  socket.on('overview', function (data) {
    if (!data.error) {
      state.all.push(data)
      bus.emit('render')
    }
  })
}
