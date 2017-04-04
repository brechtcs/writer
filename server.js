var assets = require('bankai')(__dirname + '/client.js')
var db = require('level')(process.env.DIST_DB)
var server = require('http').createServer(handler)
var io = require('socket.io')(server)

var Delta = require('quill-delta')
var xtend = require('xtend')

io.on('connection', function (socket) {
  socket.on('overview', function (req) {
    switch (req.type) {
      case 'GET': return emitAllEntries(socket)
      case 'POST': return createNewEntries(socket, req.keys)
      default: return emitError(socket, 'overview')
    }
  })

  socket.on('editor', function (req) {
    switch (req.type) {
      case 'GET': return emitSingleEntry(socket, req.key)
      case 'PATCH': return updateSingleEntry(socket, req.key, req.update)
      default: return emitError(socket, 'editor')
    }
  })
})

function handler (req, res) {
  switch (req.url) {
    case '/bundle.css': return assets.css(req, res).pipe(res)
    case '/bundle.js': return assets.js(req, res).pipe(res)
    default: return assets.html(req, res).pipe(res)
  }
}

server.listen(8989)

/**
 * Socket responses:
 */
function emitAllEntries (socket) {
  db.createKeyStream().on('data', function (key) {
    socket.emit('overview', key)
  })
}

function createNewEntries (socket, keys) {
  var empty = {
    entry: {content: new Delta()}
  }

  keys.forEach(function (key) {
    db.put(key, empty, function (err) {
      if (err) {
        return console.error(err)
      }
      console.info('created ' + key)
      socket.emit('overview', key)
    })
  })
}

function emitSingleEntry (socket, key) {
  db.get(key, function (err, value) {
    if (err) {
      return console.error(err)
    }

    var data = JSON.parse(value)
    data.key = key

    socket.emit('editor', data)
  })
}

function updateSingleEntry (socket, key, update) {
  socket.broadcast.emit('editor', {key: key, update: update})

  db.get(key, function (err, value) {
    if (err) {
      return console.error(err)
    }

    var data = JSON.parse(value)
    var delta = update.delta
    delete update.delta

    var content = new Delta(data.entry.content).compose(delta)
    data.entry.content = content
    data = xtend(data, update)

    db.put(key, JSON.stringify(data), function (err) {
      if (err) {
        return console.log(error)
      }
      console.info('updated ' + key)
    })
  })
}

function emitError (socket, topic) {
  socket.emit(topic, {error: 'Invalid request'})
}
