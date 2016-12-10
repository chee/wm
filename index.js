const {dirname} = require('path')
const {exec} = require('child_process')
const events = require('events')
const x11 = require('x11')
const EWMH = require('ewmh')

const {stringToKeys} = require('./util')
const keys = require('./lib/keys')
const Workspace = require('./workspace')
const Window = require('./window')
const listen = require('./srv')

const commandQueue = new events.EventEmitter

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
let child
let start
let X
let workspaces
let workspace = null
let screen
let root
let ewmh

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
    ewmh = new EWMH(X, root)

    ewmh.on('Desktop', desktop => exec(`notify-send "workspace switch ${desktop}"`))

    grabKeys(X, keybindings)
    grabButtons(X)

    workspaces = makeWorkspaces(5)
    workspace = workspaces[0]

    ewmh.set_number_of_desktops(5, error => {
      if (error) exec(`notify-send "${error}"`)
      ewmh.set_current_desktop(0)
    })
  }).on('event', event => {
    // todo: put all these event handlers in functions
    // todo: it will fix the duplicate decls and be neater
    // todo: perhaps emit each of these events from another emitter
    switch(event.name) {
    case 'KeyPress':
      keybindings.forEach(binding => {
        if (event.buttons == binding.buttons && event.keycode == binding.keycode) {
          exec(binding.cmd, console.log)
        }
      })
      break
    case 'ButtonPress':
      child = event.child
      X.RaiseWindow(child)
      workspace.currentWindow = Window.create(child)
      Window.focus(workspace.currentWindow)
      if (!Workspace.contains(workspace, workspace.currentWindow)) {
        Workspace.addWindow(workspace, workspace.currentWindow)
      }
      X.GetGeometry(child, (error, attr) => {
        start = event
        attributes = attr
      })
      break
    case 'MotionNotify':
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
      break
    case 'ButtonRelease':
      start = null
      break
    case 'MapRequest':
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
      let window = Window.create(event.wid)
      Workspace.addWindow(workspace, window)
      break
    case 'FocusIn':
    case 'EnterNotify':
      child = event.wid
      workspace.currentWindow = Window.create(child)
      Window.focus(workspace.currentWindow)
      break
    case 'ConfigureRequest':
      child = event.wid
      X.ResizeWindow(event.wid, event.width, event.height)
      break
    }

    X.ChangeWindowAttributes(root, {
      eventMask: x11.eventMask.SubstructureNotify
      | x11.eventMask.SubstructureRedirect
      | x11.eventMask.ResizeRedirect
      | x11.eventMask.Exposure
      | x11.eventMask.MapRequest
      | x11.eventMask.EnterWindow
      | x11.eventMask.FocusChange
    }, console.error)
  }).on('error', console.error)
}

// commands
commandQueue.on('cmd', cmd => {
  let match = cmd.match(/workspace\s+(\w+)\s+(\d+)/)

  if (match) {
    switch (match[1]) {
    case 'switch':
      // todo: make this start showing the new windows before hiding the old ones
      workspaces.forEach(workspace => Workspace.hide(workspace))
      workspace = workspaces[match[2] - 1]
      Workspace.show(workspace, root)
      ewmh.set_current_desktop(match[2] - 1)
      break
    }
  }

  match = cmd.match(/^window\s+(\w+)\s+([a-z0-9]+)/)

  if (match) {
    switch (match[1]) {
    case 'destroy':
      // workspace.currentWindow?
      break
    case 'move':
      // todo: remove only from current workspace?
      if (!workspace.currentWindow) break
      workspaces.forEach(workspace => Workspace.removeWindow(workspace, workspace.currentWindow))
      Workspace.addWindow(workspaces[match[2] - 1], workspace.currentWindow)
      Window.hide(workspace.currentWindow)
      workspace.currentWindow = null
      Workspace.show(workspace)
      break
    case 'tile':
      switch (match[2]) {
      case 'left':
        X.ResizeWindow(workspace.currentWindow.id, screen.pixel_width / 2, screen.pixel_height)
        X.MoveWindow(workspace.currentWindow.id, 0, 0)
        break
      case 'right':
        X.ResizeWindow(workspace.currentWindow.id, screen.pixel_width / 2, screen.pixel_height)
        X.MoveWindow(workspace.currentWindow.id, screen.pixel_width / 2, 0)
        break
      case 'full':
        X.ResizeWindow(workspace.currentWindow.id, screen.pixel_width, screen.pixel_height)
        X.MoveWindow(workspace.currentWindow.id, 0, 0)
      }
    }
  }
  // todo: make this just reload instead of killing the client
  match = cmd.match(/^reload$/)
  if (match) {
    workspaces.forEach(workspace => Workspace.hide(workspace))
    const home = workspace = workspaces[0]
    Workspace.show(home)
    ewmh.set_current_desktop(0)
    workspaces.forEach(workspace => {
      workspace.windows.forEach(window => {
        Workspace.removeWindow(workspace, window)
        Workspace.addWindow(home,window)
      })
    })
    X.KillClient()
    createClient()
  }
})

listen(commandQueue)
createClient()
