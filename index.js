const util = require('util')
const exec = require('child_process').exec
const events = require('events')
const fs = require('fs')
const x11 = require('x11')
const EWMH = require('ewmh')

const keys = require('./lib/xkeys')
const {stringToKeys, or} = require('./util')
const Workspace = require('./workspace')
const Window = require('./window')

const eventEmitter = new events.EventEmitter

const GRAB_MODE_ASYNC = 1
const NOTHING = 0

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

process.env.PATH = `${process.argv[1]}/bin:${process.env.PATH}`

let start
let attributes
let child
let X
let workspaces
let current_workspace = 0
let current_window = null
let root
let ewmh

x11.createClient((error, display) => {
  X = global.X = display.client
  const screen = display.screen[0]
  root = screen.root
  ewmh = new EWMH(X, root)

  ewmh.on('CurrentDesktop', desktop => exec(`notify-send "workspace switch ${desktop}"`))

  workspaces = [
    new Workspace(screen),
    new Workspace(screen),
    new Workspace(screen),
    new Workspace(screen),
    new Workspace(screen)
  ]

  ewmh.set_number_of_desktops(5, error => {
    if (error) exec(`notify-send "${error}"`)
    ewmh.set_current_desktop(0)
  })

  keybindings.forEach(binding => {
    X.GrabKey(root, true,
      binding.buttons,
      binding.keycode,
      GRAB_MODE_ASYNC,
      GRAB_MODE_ASYNC
    )
  })
  X.GrabButton(
    root, true, x11.eventMask.ButtonPress | x11.eventMask.ButtonRelease | x11.eventMask.PointerMotion,
    GRAB_MODE_ASYNC, GRAB_MODE_ASYNC, NOTHING, NOTHING, 1, keys.buttons.M
  )
  X.GrabButton(
    root, true, x11.eventMask.ButtonPress | x11.eventMask.ButtonRelease | x11.eventMask.PointerMotion,
    GRAB_MODE_ASYNC, GRAB_MODE_ASYNC, NOTHING, NOTHING, 3, keys.buttons.M
  )
}).on('event', event => {
  child = event.child
  switch(event.name) {
  case 'KeyPress':
    return keybindings.forEach(binding => {
      if (event.buttons == binding.buttons && event.keycode == binding.keycode) {
        exec(binding.cmd, console.log)
      }
    })
  case 'ButtonPress':
    child = event.child
    X.RaiseWindow(child)
    current_window = new Window(child)
    current_window.focus()
    if (!workspaces[current_workspace].contains(child)) {
      workspaces[current_workspace].addWindow(child)
    }
    return X.GetGeometry(child, (error, attr) => {
      start = event
      attributes = attr
    })
  case 'MotionNotify':
    if (!start) return
    const xdiff = event.rootx - start.rootx
    const ydiff = event.rooty - start.rooty
    start.keycode == 1 && X.MoveWindow(
      start.child,
      attributes.xPos + (start.keycode == 1 ? xdiff : 0),
      attributes.yPos + (start.keycode == 1 ? ydiff : 0)
    )
    return start.keycode == 3 && X.ResizeWindow(
      start.child,
      Math.max(1, attributes.width + (start.keycode == 3 ? xdiff : 0)),
      Math.max(1, attributes.height + (start.keycode == 3 ? ydiff : 0))
    )
  case 'ButtonRelease':
    return start = null
  case 'MapRequest':
    X.GetWindowAttributes(event.window, (error, attributes) => {
      if (error) return console.error(error)
      if (attributes[8]) {
        return X.MapWindow(event.wid)
      }
    })
    console.log(event.wid, 'wid')
    X.ChangeWindowAttributes(
      event.wid,
      {eventMask: x11.eventMask.EnterWindow}
    )
    workspaces[current_workspace].addWindow(event.wid)
    console.log(event.wid, 'wid')
    return
  case 'EnterWindow':
    child = event.wid
    current_window = new Window(event.wid)
    current_window.focus()
    if (!workspaces[current_workspace].contains(child)) {
      workspaces[current_workspace].addWindow(child)
    }
    exec(`notify-send ${util.inspect(event)}`)
  case 'ConfigureRequest':
    child = event.wid
    X.ResizeWindow(event.wid, event.width, event.height)
  }

  X.ChangeWindowAttributes(root, {
    eventMask: x11.eventMask.SubstructureNotify
    | x11.eventMask.SubstructureRedirect
    | x11.eventMask.ResizeRedirect
    | x11.eventMask.Exposure
    | x11.eventMask.MapRequest
    | x11.eventMask.EnterWindow
  }, console.error)
}).on('error', console.error)

// commands
eventEmitter.on('cmd', cmd => {
  let match = cmd.match(/workspace\s+(\w+)\s+(\d+)/)

  if (match) {
    switch (match[1]) {
    case 'switch':
      // todo: make this start showing the new windows before hiding the old ones
      workspaces.forEach(workspace => workspace.hide())
      current_workspace = match[2] - 1
      workspaces[current_workspace].show()
      ewmh.set_current_desktop(match[2] - 1)
      break
    }
  }

  match = cmd.match(/^window\s+(\w+)\s+([a-z0-9]+)/)

  if (match) {
    switch (match[1]) {
      case 'destroy':
        current_window.kill()
        break
      case 'move':
        workspaces.forEach(workspace => workspace.removeWindow(current_window.id))
        workspaces[match[2] - 1].addWindow(current_window.id)
        current_window.hide()
        workspaces[current_workspace].show()
        break
    }
  }

  match = cmd.match(/^reload$/)
  if (match) {
    X.SetInputFocus(root)
  }
})

require('./srv')(eventEmitter)
