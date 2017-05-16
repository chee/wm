const {dirname} = require('path')
const events = require('events')
const x11 = require('x11')

const Command = require('./src/command')
const Event = require('./src/event')
const listen = require('./src/srv')
const configure = require('./src/configure')

const name = require('./lib/name')

const emitter = new events.EventEmitter()

process.env.PATH = `${dirname(process.argv[1])}/bin:${process.env.PATH}`

// globals are: X, screen, root, keybindings, workspaces & currentWorkspace
function createClient () {
  x11.createClient((error, display) => {
    if (error) {
      console.error('error:', error)
    }
    global.screen = display.screen[0]
    global.root = global.screen.root
    global.X = display.client
    configure()
    global.currentWorkspace = global.workspaces[0]
  })
  .on('event', event => {
    Event[event.name]
    ? Event[event.name](event)
    : console.warn(`unhandled event: ${event.name}`)
  })
  .on('error', console.error)
}

emitter.on('cmd', ({target, method, message}) => (
  Command[target][method](message)
))

listen({name, emitter})

createClient()
