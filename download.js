var level = require('level')
var minimist = require('minimist')
var request = require('request')

var argv = minimist(process.argv.slice(2))
var db = level(process.env.DIST_DB)

if (argv.pad) {
  var ether = (usr, pwd) => `https://${usr}:${pwd}@distilled.pm/p/`
  var user = process.env.PAD_USR
  var password = process.env.PAD_PWD

  request(ether(user, password) + argv.pad + '/export/txt', function (err, res, body) {
    if (err) {
      throw new Error(err)
    }
    console.info('Downloaded from etherpad')

    var value = {
      entry: {
        content: {ops: [{insert: body}]}
      }
    }

    db.put('pamphlet/' + argv.pad, JSON.stringify(value), function (err) {
      if (err) {
        throw new Error(err)
      }
      console.info('Written to database')
    })
  })
}
else {
  throw new Error('Etherpad URI (--pad option) is required')
}
