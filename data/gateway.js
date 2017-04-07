var http = require('http')

module.exports = function (db) {
  return http.createServer(function (req, res) {
    if (req.url !== '/') {
      var key = req.url.replace(/^\//, '')

      db.get(key, function (err, value) {
        if (err) {
          res.writeHead(404)
          return res.end('{"error": "not found"}')
        }

        res.writeHead(200)
        res.end(value)
      })
    }
    else {
      var keys = []
      var stream = db.createKeyStream()

      stream.on('data', function (key) {
        keys.push(key)
      })
      stream.on('end', function () {
        res.writeHead(200)
        res.end(JSON.stringify(keys))
      })
      stream.on('error', function (err) {
        res.writeHead(500)
        res.end('{"error": "server error"}')
        console.error(err)
      })
    }
  })
}
