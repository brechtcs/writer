var html = require('choo/html')

module.exports.display = function (state, emit) {
  return html`
    <body>
      <header>Distillery</header>
      <main>
        <nav>
          <a href="/overview">Sign in</a>
        </nav>
      </main>
    </body>
  `
}
