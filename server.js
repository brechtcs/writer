var bankai = require('bankai')
var host = require('samizdat')
var level = require('level')
var samizdat = require('samizdat/db')

var db = samizdat(level('data'))
var app = host(db, {logLevel: 'info'})

var assets = bankai('client.js', {
    debug: true,
    watch: false
})

app.route('GET', '/*', function (req, res) {
    switch (req.url) {
        case '/bundle.css': return assets.css(req, res).pipe(res)
        case '/bundle.js': return assets.js(req, res).pipe(res)
        default: return assets.html(req, res).pipe(res)
    }
})

app.listen(1905)
