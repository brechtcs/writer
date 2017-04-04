var app = require('./app')
var css = require('sheetify')

document.title = 'Distillery'
css('./main.css')

app.mount('body')
