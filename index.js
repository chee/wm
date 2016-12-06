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

let start
let attributes
let child
let X
let workspaces

x11.createClient((error, display) => {
  X = display.client
  const screen = display.screen[0]
  const root = screen.root

  workspaces = [
    new Workspace(X, screen),
    new Workspace(X, screen),
    new Workspace(X, screen)
  ]


  workspaces[1].addWindow

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
  fs.writeFile('/tmp/event', util.inspect(event))
  child = event.child
  if (event.name == 'KeyPress' && event.child != 0) {
    keybindings.forEach(binding => {
      if (event.buttons == binding.buttons && event.keycode == binding.keycode) {
        exec(binding.cmd, console.log)
      }
    })
  } else if (event.name == 'ButtonPress' && event.child != 0) {
    X.RaiseWindow(event.child)
    X.GetGeometry(event.child, (error, attr) => {
      start = event
      attributes = attr
    })
  } else if (event.name == 'MotionNotify' && start) {
    const xdiff = event.rootx - start.rootx
    const ydiff = event.rooty - start.rooty
    start.keycode == 1 && X.MoveWindow(
      start.child,
      attributes.xPos + (start.keycode == 1 ? xdiff : 0),
      attributes.yPos + (start.keycode == 1 ? ydiff : 0)
    )
    start.keycode == 3 && X.ResizeWindow(
      start.child,
      Math.max(1, attributes.width + (start.keycode == 3 ? xdiff : 0)),
      Math.max(1, attributes.height + (start.keycode == 3 ? ydiff : 0))
    )
  } else if (event.name == 'ButtonRelease') {
    start = null
  }
}).on('error', error => {
  console.error(error)
  debugger
})

eventEmitter.on('cmd', cmd => {
  fs.writeFile('/tmp/XXX', util.inspect(X), ()=>{})
  fs.writeFile('/tmp/child', util.inspect(child), Function.prototype)
  fs.writeFile('/tmp/path', util.inspect(process.argv), Function.prototype)
  let match = cmd.match(/workspace (\d)/)
  if (match) {
    workspaces.forEach(workspace => workspace.hide())
    workspaces[match[1]].show()
  }
})

require('./srv')(eventEmitter)
