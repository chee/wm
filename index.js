const {dirname} = require('path')
const events = require('events')
const x11 = require('x11')

const {setupKeybindings} = require('./util')
const keys = require('./lib/keys')
const Command = require('./command')
const Event = require('./event')
const Workspace = require('./workspace')
const listen = require('./srv')

const emitter = new events.EventEmitter

const name = 'wm'

const ASYNC = 1
const NOPE = 0

process.env.PATH = `${dirname(process.argv[1])}/bin:${process.env.PATH}`

// globals are: X, screen, root, keybindings, workspaces & currentWorkspace
function createClient() {
  x11.createClient((error, display) => {
    const configuration = require('rc')(name)
    global.screen = display.screen[0]
    global.root = global.screen.root
    global.X = display.client

    // todo: ungrab old keys
    global.keybindings = setupKeybindings(configuration.keybindings)
    global.workspaces = makeWorkspaces(configuration.settings ? configuration.settings.workspaces : 5)
    global.currentWorkspace = global.workspaces[0]

    grabKeys(global.X, global.keybindings)
    grabButtons(global.X)

    global.X.ChangeWindowAttributes(global.root, {
      eventMask: x11.eventMask.SubstructureNotify
      | x11.eventMask.SubstructureRedirect
      | x11.eventMask.ResizeRedirect
      | x11.eventMask.Exposure
      | x11.eventMask.MapRequest
      | x11.eventMask.EnterWindow
      | x11.eventMask.FocusChange
    }, console.error)
  })
  .on('event', event => {
    Event[event.name]
    ? Event[event.name](event)
    : console.warn(`unhandled event: ${event.name}`)
  })
  .on('error', console.error)
}

function grabKeys(X, bindings) {
  bindings.forEach(binding => {
    X.GrabKey(global.root, true,
      binding.buttons,
      binding.keycode,
      ASYNC,
      ASYNC
    )
  })
}

// todo: make this key configurable
function grabButtons(X) {
  X.GrabButton(
    global.root, true, x11.eventMask.ButtonPress | x11.eventMask.ButtonRelease | x11.eventMask.PointerMotion,
    ASYNC, ASYNC, NOPE, NOPE, 1, keys.buttons.M
  )
  X.GrabButton(
    global.root, true, x11.eventMask.ButtonPress | x11.eventMask.ButtonRelease | x11.eventMask.PointerMotion,
    ASYNC, ASYNC, NOPE, NOPE, 3, keys.buttons.M
  )
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
