var db = require('../db')

db.createReadStream().on('data', function (data) {
  var value = JSON.parse(data.value)

  if (value.entry && value.entry.content) {
    value.content = value.entry.content
    delete value.entry.content
  }

  db.put(data.key, JSON.stringify(value), function (err) {
    if (err) throw new Error(err)
  })
})
