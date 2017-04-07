var db = require('./db')

db.createReadStream().on('data', function (data) {
  if (JSON.parse(data.value).deleted === true) {
    db.del(data.key, function (err) {
      if (err) {
        return console.error(err)
      }
      console.info('cleared', data.key)
    })
  }
})
