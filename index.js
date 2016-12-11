const {dirname} = require('path')
const {exec} = require('child_process')
const events = require('events')
const x11 = require('x11')

const {stringToKeys, constrainNumber} = require('./util')
const keys = require('./lib/keys')
const Workspace = require('./workspace')
const Window = require('./window')
const listen = require('./srv')

const commands = new events.EventEmitter
const xevents = new events.EventEmitter

const name = 'wm'
const configuration = require('rc')(name)

// todo: fix this completely
const keybindings = (() => {
  const keybindings = []
  for (const binding in configuration.keybindings) {
    keybindings.push(Object.assign({}, {
      cmd: configuration.keybindings[binding]
    }, stringToKeys(binding)))
  }
  return keybindings
})()

const ASYNC = 1
const NOPE = 0

process.env.PATH = `${dirname(process.argv[1])}/bin:${process.env.PATH}`

let attributes
let start
let X
let workspaces
let currentWorkspace = null
let screen
let root

function grabKeys(X, bindings) {
  bindings.forEach(binding => {
    X.GrabKey(root, true,
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
    root, true, x11.eventMask.ButtonPress | x11.eventMask.ButtonRelease | x11.eventMask.PointerMotion,
    ASYNC, ASYNC, NOPE, NOPE, 1, keys.buttons.M
  )
  X.GrabButton(
    root, true, x11.eventMask.ButtonPress | x11.eventMask.ButtonRelease | x11.eventMask.PointerMotion,
    ASYNC, ASYNC, NOPE, NOPE, 3, keys.buttons.M
  )
}

// todo: make this size configurable
function makeWorkspaces(size) {
  const workspaces = []
  for (let id = 0; id < size; id++) {
    workspaces.push(Workspace.create(id))
  }
  return workspaces
}

function createClient() {
  x11.createClient((error, display) => {
    screen = display.screen[0]
    root = screen.root
    X = global.X = display.client
    grabKeys(X, keybindings)
    grabButtons(X)

    workspaces = makeWorkspaces(5)
    currentWorkspace = workspaces[0]

    X.ChangeWindowAttributes(root, {
      eventMask: x11.eventMask.SubstructureNotify
      | x11.eventMask.SubstructureRedirect
      | x11.eventMask.ResizeRedirect
      | x11.eventMask.Exposure
      | x11.eventMask.MapRequest
      | x11.eventMask.EnterWindow
      | x11.eventMask.FocusChange
    }, console.error)
  })
  .on('event', event => xevents.emit(event.name, event))
  .on('error', console.error)
}

function focus(event) {
  currentWorkspace.currentWindow = Window.create(event.wid)
  Window.focus(currentWorkspace.currentWindow)
}

// xevents
xevents.on('KeyPress', event => {
  keybindings.forEach(binding => {
    if (event.buttons == binding.buttons && event.keycode == binding.keycode) {
      exec(binding.cmd, console.log)
    }
  })
}).on('ButtonPress', event => {
  const child = event.child
  X.RaiseWindow(child)
  currentWorkspace.currentWindow = Window.create(child)
  Window.focus(currentWorkspace.currentWindow)
  if (!Workspace.contains(currentWorkspace, currentWorkspace.currentWindow)) {
    Workspace.addWindow(currentWorkspace, currentWorkspace.currentWindow)
  }
  X.GetGeometry(child, (error, attr) => {
    start = event
    attributes = attr
  })
}).on('MotionNotify', event => {
  if (!start) return
  const xdiff = event.rootx - start.rootx
  const ydiff = event.rooty - start.rooty
  start.keycode == 1 && start.buttons == keys.buttons.M && X.MoveWindow(
    start.child,
    attributes.xPos + (start.keycode == 1 ? xdiff : 0),
    attributes.yPos + (start.keycode == 1 ? ydiff : 0)
  )
  start.keycode == 3 && X.ResizeWindow(
    start.child,
    Math.max(1, attributes.width + (start.keycode == 3 ? xdiff : 0)),
    Math.max(1, attributes.height + (start.keycode == 3 ? ydiff : 0))
  )
}).on('ButtonRelease', () => start = null)
.on('MapRequest', event => {
  X.GetWindowAttributes(event.wid, (error, attributes) => {
    if (error) return console.error(error)
    if (attributes[8]) {
      return X.MapWindow(event.wid)
    }
  })
  X.ChangeWindowAttributes(
    event.wid,
    {eventMask: x11.eventMask.EnterWindow}
  )
  const window = Window.create(event.wid)
  Workspace.addWindow(currentWorkspace, window)
}).on('FocusIn', focus).on('EnterNotify', focus)
.on('ConfigureRequest', event => {
  X.ResizeWindow(event.wid, event.width, event.height)
})

// commands
commands.on('cmd', cmd => {
  let match = cmd.match(/workspace\s+(\w+)\s+(\d+)/)

  // todo: `if (match) switch` is pretty psychedelic 🎇 (not in a good way)
  if (match) switch (match[1]) {
  case 'switch':
    // todo: make this start showing the new windows before hiding the old ones
    workspaces.forEach(workspace => Workspace.hide(workspace))
    currentWorkspace = workspaces[constrainNumber(match[2] - 1, workspaces.length)]
    Workspace.show(currentWorkspace, root)
    break
  }

  match = cmd.match(/^window\s+(\w+)\s+([a-z0-9]+)/)
  if (match) switch (match[1]) {
  case 'destroy':
    // todo: make this do something
    break
  case 'move':
    if (!currentWorkspace.currentWindow) break
    // todo: remove only from currentWorkspace? (it shouldn't be on other workspaces, all being well (which it often isn't))
    workspaces.forEach(workspace => Workspace.removeWindow(workspace, currentWorkspace.currentWindow))
    Workspace.addWindow(workspaces[constrainNumber(match[2] - 1, workspaces.length)], currentWorkspace.currentWindow)
    Window.hide(currentWorkspace.currentWindow)
    currentWorkspace.currentWindow = null
    Workspace.show(currentWorkspace)
    break
  case 'tile':
    switch (match[2]) {
    case 'left':
      X.ResizeWindow(currentWorkspace.currentWindow.id, screen.pixel_width / 2, screen.pixel_height)
      X.MoveWindow(currentWorkspace.currentWindow.id, 0, 0)
      break
    case 'right':
      X.ResizeWindow(currentWorkspace.currentWindow.id, screen.pixel_width / 2, screen.pixel_height)
      X.MoveWindow(currentWorkspace.currentWindow.id, screen.pixel_width / 2, 0)
      break
    case 'full':
      X.ResizeWindow(currentWorkspace.currentWindow.id, screen.pixel_width, screen.pixel_height)
      X.MoveWindow(currentWorkspace.currentWindow.id, 0, 0)
    }
  }

  // todo: make this do something
  match = cmd.match(/^reload$/)
})

listen(commands)
createClient()
