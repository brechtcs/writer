var bankai = require('bankai')
var level = require('level')
var samizdat = require('samizdat-host')

var app = samizdat(level('data'), {logLevel: 'info'})
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
