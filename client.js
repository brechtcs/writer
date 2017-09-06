var SimpleMDE = require('simplemde')

var choo = require('choo')
var css = require('sheetify')
var html = require('choo/html')
var http = require('xhr')
var levelup = require('levelup')
var leveljs = require('level-js')
var marked = require('marked')
var onload = require('on-load')
var pull = require('pull-stream')
var samizdat = require('samizdat/db')
var ts = require('samizdat/ts')
var yml = require('js-yaml')

var app = choo()
var db = samizdat(levelup('data', {db: leveljs}))

css('simplemde/dist/simplemde.min.css')

/**
 * App handlers
 */
app.use(function (state, bus) {
    if (window.Notification) {
        if (Notification.permission === 'default') {
            Notification.requestPermission()
        }

        bus.on('alert', function (msg) {
            new Notification(msg)
        })

        bus.on('error', function (msg) {
            new Notification(msg)
        })
    }

    document.title = 'Writer'

    bus.on('*', console.info)
    window.state = state
    window.db = db
    window.bus = bus
})

app.use(function (state, bus) {
    bus.on('db:sync', function () {
        get('/_sync', function (err, data) {
            if (err) {
                throw err
            }

            pull(
                pull.values(data),
                pull.map(function (entry) {
                    if (entry.value === '') {
                        return {key: entry.key, value: '\n'}
                    }
                    return entry
                }),
                db.sink(function (err) {
                    if (err) {
                        return bus.emit('error', err)
                    }
                    bus.emit('alert', 'Successfully synced data from the server')
                    bus.emit('render')
                })
            )
        })
    })

    bus.emit('db:sync')
})

app.use(function (state, bus) {
    state.docs = null
    state.path = []

    bus.on('overview:load', function () {
        db.docs(function (err, docs) {
            if (err) {
                if (err.notFound) {
                    return bus.emit('error', 'No documents were found in the database')
                }
                throw err
            }
            state.docs = docs
            bus.emit('render')
        })
    })
})

app.use(function (state, bus) {
    state.path.push(null)

    bus.on('doc:load', function (doc) {
        state.versions = []
        state.path = [doc]
        bus.emit('render')

        db.history(doc, function (err, versions) {
            if (err) {
                if (err.notFound) {
                    return bus.emit('error', 'No versions were found in the database for ' + doc)
                }
                throw err
            }
            state.versions = versions.map(function (key) {
                return [ts.getCurrent(key), ts.getPrev(key)].join('-')
            })
            bus.emit('render')
        })
    })
})

app.use(function (state, bus) {
    state.path.push(null)

    bus.on('version:load', function (path) {
        state.path = path
        state.entry = {}

        db.read(path[1] + '-' + path[0], function (err, value) {
            if (err) {
                return bus.emit('error', err)
            }
            state.entry = jekyll(value)
            bus.emit('render')
        })
    })

    bus.on('version:commit', function (content) {
        if (content === state.entry.editor) return

        post('/_files/' + state.path.join('/'), content, function (err, version) {
            if (err) {
                return bus.emit('error', err)
            }

            db._level.put(version.key, content, function (err) {
                if (err) {
                    return bus.emit('error', err)
                }
                var next = version.key.split('-').slice(0, 2).join('-')
                bus.emit('pushState', '/' + state.path[0] + '/' + next)
            })
        })
    })

    bus.on('version:cancel', function () {
        bus.emit('pushState', './')
    })
})


/**
 * App views
 */
app.route('/', function (state, emit) {
    if (!state.docs) {
        emit('overview:load')
    }

    return html`<body>
        <main>
            <h1>Documents</h1>
            <ul>${state.docs && state.docs.map(item)}</ul>
        </main>
    </body>`

    function item (doc) {
        return html`<li>
            <a href="/${doc}">${doc}</a>
        </li>`
    }
})

app.route('/:doc', function (state, emit) {
    if (state.path[0] !== state.params.doc || state.path[1]) {
        emit('doc:load', state.params.doc)
    }

    return html`<body>
        <main>
            <h1>${state.params.doc}</h1>
            <nav>
                <a href="/">home</a>
                <a href="/${state.params.doc}/${state.versions[state.versions.length - 1]}">latest</a>
            </nav>
            <dl>${state.versions.map(item)}</dl>
        </main>
    </body>`

    function item (version, i) {
        var dates = ts.parse(version)
        var number = i + 1

        return html`<div>
            <dt><a href="/${state.params.doc}/${version}">Version ${number}</a></dt>
            <dd>${dates[1] ? display(dates[1]) : ''}</dd>
            <dd>${display(dates[0])}</dd>
        </div>`
    }

    function display (date) {
        return date.toLocaleString()
    }
})

app.route('/:doc/:version', function (state, emit) {
    if (state.path[1] !== state.params.version) {
        emit('version:load', [state.params.doc, state.params.version])
    }

    return html`<body>
        <main>
            <h1>${state.params.doc}</h1>
            <nav>
                <a href="/${state.params.doc}">versions</a>
                <a href="/${state.params.doc}/${state.params.version}/edit">edit</a>
            </nav>
            ${state.entry.meta ? meta(state.entry.meta) : ''}
            ${state.entry.content}
        </main>
    </body>`

    function meta (data) {
        return html`<section>
            <dl>${Object.keys(data).map(display(data))}</dl>
        </section>`
    }

    function display (data) {
        return function (key) {
            var value = data[key]

            return html`<div>
                <dt>${key}</dt>
                <dd>${Array.isArray(value) ? value.join(', ') : typeof value === 'object' ? yaml(value) : value}</dd>
            </div>`
        }
    }

    function yaml (obj) {
        return html`<div style="white-space:pre">
            ${yml.safeDump(obj)}
        </div>`
    }
})

app.route('/:doc/:version/edit', function (state, emit) {
    if (state.path[1] !== state.params.version) {
        emit('version:load', [state.params.doc, state.params.version])
    }
    var mde

    return html`<body>
        <form onsubmit=${commit}>
            <fieldset class="actions">
                <button type="button" onclick=${cancel}>cancel</button>
                <button type="submit">commit</button>
            </fieldset>
            ${editor()}
        </form>
    </body>`

    function editor () {
        var id = state.params.version + '-' + state.params.doc
        var textarea = html`
            <fieldset class="editor" id=${id}>
                <textarea name="content">${state.entry.editor}</textarea>
            </fieldset>
        `

        textarea.isSameNode = function (el) {
            return el && el.id === id
        }

        onload(textarea, function (el) {
            mde = new SimpleMDE({
                element: el.querySelector('textarea'),
                autosave: {
                    enabled: true,
                    uniqueId: id
                }
            })
        }, function (el) {
            mde = null
        })

        return textarea
    }

    function commit (event) {
        event.preventDefault()
        emit('version:commit', mde.value())
    }

    function cancel () {
        emit('version:cancel')
    }
})

app.mount('body')


/**
 * Parse Jekyll post format
 */
function jekyll (txt) {
    var doc = {}
    var content

    if (/^---\n/.test(txt)) {
        var parts = txt.split('\n---\n')
        content = parts.slice(1).join('\n---\n').replace(/^\n/, '')
        doc.meta = yml.safeLoad(parts[0].replace(/^---\n/, ''))
    }
    else {
        content = txt
        doc.meta = {}
    }
    
    doc.content = html`<section class="content"></section>`
    doc.content.innerHTML = marked(content)
    doc.editor = txt
    return doc
}

/**
 * HTTP methods
 */
function get (endpoint, cb) {
    http.get(endpoint + '?output=json', {
        json: true
    }, function (err, res) {
        if (err) {
            return cb(err)
        }
        if (res.statusCode === 404) {
            return cb({notFound: true})
        }
        cb(null, res.body)
    })
}

function post (endpoint, body, cb) {
    http.post(endpoint + '?output=json', {
        body: body,
        json: false
    }, function (err, res) {
        if (err) {
            return cb(err)
        }
        if (res.statusCode === 404) {
            return cb({notFound: true})
        }
        cb(null, JSON.parse(res.body))
    })
}
