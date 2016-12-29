const {dirname} = require('path')
const events = require('events')
const x11 = require('x11')

const Command = require('./src/command')
const Workspace = require('./src/workspace')
const Event = require('./src/event')
const listen = require('./src/srv')
const bind = require('./src/bind')

const name = require('./lib/name')

const emitter = new events.EventEmitter

process.env.PATH = `${dirname(process.argv[1])}/bin:${process.env.PATH}`

// globals are: X, screen, root, keybindings, workspaces & currentWorkspace
function createClient() {
  x11.createClient((error, display) => {
    const configuration = require('rc')(name)

    global.screen = display.screen[0]
    global.root = global.screen.root
    global.X = display.client

    global.workspaces = makeWorkspaces(
      configuration.settings && configuration.settings.workspaces
      ? configuration.settings.workspaces
      : 5
    )
    global.currentWorkspace = global.workspaces[0]

    bind()
  })
  .on('event', event => {
    Event[event.name]
    ? Event[event.name](event)
    : console.warn(`unhandled event: ${event.name}`)
  })
  .on('error', console.error)
}

function makeWorkspaces(size) {
  const workspaces = []
  for (let id = 0; id < size; id++) {
    workspaces.push(Workspace.create(id))
  }
  return workspaces
}

emitter.on('cmd', ({target, method, message}) => (
  Command[target][method](message)
))

listen({name, emitter})

createClient()
