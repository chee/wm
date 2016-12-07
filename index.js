const util = require('util')
const exec = require('child_process').exec
const events = require('events')
const fs = require('fs')
const x11 = require('x11')

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

console.error = error => {
  fs.writeFile('/tmp/error', util.inspect(error), console.log)
}

let start
let attributes
let child
let X
let workspaces
let current_workspace = 0
let root

x11.createClient((error, display) => {
  X = display.client
  const screen = display.screen[0]
  root = screen.root

  workspaces = [
    new Workspace(X, screen),
    new Workspace(X, screen),
    new Workspace(X, screen),
    new Workspace(X, screen),
    new Workspace(X, screen)
  ]

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
  fs.writeFile('/tmp/event', util.inspect(event), console.error)
  child = event.child
  switch(event.name) {
  case 'KeyPress':
    return keybindings.forEach(binding => {
      if (event.buttons == binding.buttons && event.keycode == binding.keycode) {
        exec(binding.cmd, console.log)
      }
    })
  case 'ButtonPress':
    X.RaiseWindow(event.child)
    return X.GetGeometry(event.child, (error, attr) => {
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
    const window = new Window(event.wid)
    window.focus()
    if (!workspaces[current_workspace].contains(event.wid)) {
      workspaces[current_workspace].addWindow(event.wid)
    }
    exec(`notify-send ${util.inspect(event)}`)
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
  fs.writeFile('/tmp/XXX', util.inspect(X), ()=>{})
  fs.writeFile('/tmp/child', util.inspect(child), Function.prototype)
  fs.writeFile('/tmp/path', util.inspect(process.argv), Function.prototype)
  let match = cmd.match(/workspace (\d)/)

  if (match) {
    workspaces.forEach(workspace => workspace.hide())
    current_workspace = match[1] - 1
    workspaces[current_workspace].show()
    fs.writeFile('/tmp/workspace', util.inspect(current_workspace), Function.prototype)
  }

  match = cmd.match(/^reload$/)
  if (match) {

  }
})

require('./srv')(eventEmitter)
