var html = require('choo/html')
var socket = require('./socket')

module.exports.display = function (state, emit) {
  return html`
    <body>
      <header>Overview</header>
      <main>
        <form onsubmit=${create}>
          <ul class="entries">
            <li>
              <span class="title">
                <label for="new-pamphlet">pamphlet/</label>
                <input id="new-pamphlet" name="pamphlet" type="text">
              </span>
              <button type="submit">create</button>
            </li>
            ${state.all.sort().map(item)}
          </ul>
        </form>
      </main>
    </body>
  `

  function item (entry) {
    return html`
      <li>
        <span class="title">${entry}</span>
        <button type="button" onclick=${() => rm(entry)}>delete</button>
        <a href=${entry}>open</a>
      </li>
    `
  }

  function rm (key) {
    emit('overview:rm', key)
  }

  function create (event) {
    emit('overview:new', event.target.elements.pamphlet.value)
    event.preventDefault()
    event.target.reset()
  }
}

module.exports.listen = function (state, bus) {
  state.all = []
  state.create = ''

  bus.on('overview:add', function (key) {
    state.all.push(key)
  })

  bus.on('overview:rm', function (key) {
    state.all = state.all.filter(function (entry) {
      return entry !== key
    })

    socket.emit('overview', {type: 'DELETE', keys: [key]})
    bus.emit('render')
  })

  bus.on('overview:new', function (key) {
    if (key) {
      socket.emit('overview', {type: 'POST', keys: ['pamphlet/' + key]})
    }
  })

  socket.emit('overview', {type: 'GET'})
  socket.on('overview', function (data) {
    if (!data.error) {
      bus.emit('overview:add', data)
      bus.emit('render')
    }
  })
}
