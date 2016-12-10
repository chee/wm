const util = require('util')

const path = require('path')
const exec = require('child_process').exec
const events = require('events')
const x11 = require('x11')
const EWMH = require('ewmh')

const keys = require('./lib/keys')
const {stringToKeys, or} = require('./util')
const Workspace = require('./workspace')
const Window = require('./window')

const eventEmitter = new events.EventEmitter

const name = 'wm'
const configuration = require('rc')(name)

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

process.env.PATH = `${path.dirname(process.argv[1])}/bin:${process.env.PATH}`

let attributes
let child
let X
let workspaces
let currentWorkspace
let currentWindow = null
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
function makeWorkspaces(screen, size) {
  return Array.from(Array(size), () => new Workspace(screen))
}

function createClient() {
  x11.createClient((error, display) => {
    screen = display.screen[0]
    root = screen.root
    X = global.X = display.client
    ewmh = new EWMH(X, root)

    ewmh.on('CurrentDesktop', desktop => exec(`notify-send "workspace switch ${desktop}"`))

    grabKeys(X, keybindings)
    grabButtons(X)

    workspaces = makeWorkspaces(screen, 5)
    currentWorkspace = workspaces[0]

    ewmh.set_number_of_desktops(5, error => {
      if (error) exec(`notify-send "${error}"`)
      ewmh.set_current_desktop(0)
    })
  }).on('event', event => {
    child = event.child
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
      currentWindow = new Window(child)
      currentWindow.focus()
      if (!currentWorkspace.contains(child)) {
        currentWorkspace.addWindow(child)
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
      X.GetWindowAttributes(event.window, (error, attributes) => {
        if (error) return console.error(error)
        if (attributes[8]) {
          return X.MapWindow(event.wid)
        }
      })
      X.ChangeWindowAttributes(
        event.wid,
        {eventMask: x11.eventMask.EnterWindow}
      )
      currentWorkspace.addWindow(event.wid)
      break
    case 'FocusIn':
    case 'EnterNotify':
      child = event.wid
      currentWindow = new Window(child)
      currentWindow.focus()
      if (!currentWorkspace.contains(child)) {
        workspaces.forEach(workspace => workspace.removeWindow(currentWindow.id))
        currentWorkspace.addWindow(child)
      }
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
eventEmitter.on('cmd', cmd => {
  let match = cmd.match(/workspace\s+(\w+)\s+(\d+)/)

  if (match) {
    switch (match[1]) {
    case 'switch':
      // todo: make this start showing the new windows before hiding the old ones
      workspaces.forEach(workspace => workspace.hide())
      currentWorkspace = workspaces[match[2] - 1]
      currentWorkspace.show()
      ewmh.set_current_desktop(match[2] - 1)
      break
    }
  }

  match = cmd.match(/^window\s+(\w+)\s+([a-z0-9]+)/)

  if (match) {
    switch (match[1]) {
      case 'destroy':
        currentWindow.kill()
        break
      case 'move':
        workspaces.forEach(workspace => workspace.removeWindow(currentWindow.id))
        workspaces[match[2] - 1].addWindow(currentWindow.id)
        currentWindow.hide()
        currentWorkspace.show()
        break
      case 'tile':
        switch (match[2]) {
        case 'left':
          X.ResizeWindow(currentWindow.id, screen.pixel_width / 2, screen.pixel_height)
          X.MoveWindow(currentWindow.id, 0, 0)
          break
        case 'right':
          X.ResizeWindow(currentWindow.id, screen.pixel_width / 2, screen.pixel_height)
          X.MoveWindow(currentWindow.id, screen.pixel_width / 2, 0)
          break
        case 'full':
          X.ResizeWindow(currentWindow.id, screen.pixel_width, screen.pixel_height)
          X.MoveWindow(currentWindow.id, 0, 0)
        }
    }
  }
  match = cmd.match(/^reload$/)
  if (match) {
    workspaces.forEach(workspace => workspace.hide())
    currentWorkspace = workspaces[0]
    currentWorkspace.show()
    ewmh.set_current_desktop(0)
    workspaces.forEach(workspace => {
      workspace.mapWindow(window => {
        workspace.removeWindow(window.id)
        currentWorkspace.addWindow(window.id)
      })
    })
    X.KillClient()
    createClient()
    eventEmitter.emit('die')
    require('./srv')(eventEmitter)
  }
})

require('./srv')(eventEmitter)
createClient()
