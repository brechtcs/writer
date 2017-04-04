var app = require('./app')
var css = require('sheetify')

document.title = 'Distillery'

var style = css`
  * {
    box-sizing: border-box;
    color: inherit;
    font: inherit;
    margin: 0;
    padding: 0;
  }
  body {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
  }
  header {
    border-bottom: 3px solid #d50000;
    font-size: 2rem;
    font-weight: bold;
    position: absolute;
    padding: 1em 0;
    top: 0;
    text-align: center;
    width: 100vw;
  }
  main {
    height: 62vh;
    width: 62vw;
  }
  nav {
    text-align: center;
  }
  p + p {
    text-indent: 1.62em;
  }
  ul {
    list-style: none;
  }
`

app.mount('body')
