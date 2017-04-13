var db = require('./data/db')
var gateway = require('./data/gateway')(db)
var assets = require('bankai')(__dirname + '/client.js')
var server = require('http').createServer(handler)
var io = require('socket.io')(server)

var Delta = require('quill-delta')
var xtend = require('xtend')

io.on('connection', function (socket) {
  socket.on('overview', function (req) {
    switch (req.type) {
      case 'GET': return emitEntriesList(socket)
      case 'DELETE': return deleteEntriesList(socket, req.keys)
      case 'POST': return createEntriesList(socket, req.keys)
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
  console.info('http', req.url)

  switch (req.url) {
    case '/bundle.css': return assets.css(req, res).pipe(res)
    case '/bundle.js': return assets.js(req, res).pipe(res)
    default: return assets.html(req, res).pipe(res)
  }
}

gateway.listen(8787)
server.listen(8989)

/**
 * Socket responses:
 */
function emitEntriesList (socket) {
  db.createReadStream().on('data', function (data) {
    if (JSON.parse(data.value).deleted !== true) {
      socket.emit('overview', data.key)
    }
  })
}

function deleteEntriesList (socket, keys) {
  keys.forEach(function (key) {
    updateSingleEntry(socket, key, {deleted: true})
  })
}

function createEntriesList (socket, keys) {
  var empty = {
    entry: {content: new Delta()}
  }

  keys.forEach(function (key) {
    db.get(key, function (err, value) {
      if (err && !err.notFound) {
        return console.error(err)
      }
      var create = err && err.notFound

      if (!err && JSON.parse(value).deleted) {
        create = true
      }

      if (create) {
        db.put(key, JSON.stringify(empty), function (err) {
          if (err) {
            return console.error(err)
          }
          console.info('created', key)
          socket.emit('overview', key)
        })
      }
      else {
        console.info('exists', key)
      }
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
  if (update.delta) {
    socket.broadcast.emit('editor', {key: key, update: update})
  }

  db.get(key, function (err, value) {
    if (err) {
      return console.error(err)
    }

    var data = JSON.parse(value)

    if (update.delta) {
      var delta = update.delta
      var content = new Delta(data.entry.content).compose(delta)
      data.entry.content = content
      delete update.delta
    }
    data = xtend(data, update)

    db.put(key, JSON.stringify(data), function (err) {
      if (err) {
        return console.log(error)
      }

      console.info(update.deleted ? 'deleted' : 'updated', key)
    })
  })
}

function emitError (socket, topic) {
  socket.emit(topic, {error: 'Invalid request'})
}
