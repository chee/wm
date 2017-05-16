const {exec} = require('child_process')
const x11 = require('x11')

const Workspace = require('./workspace')
const Window = require('./window')
const keys = require('../lib/keys')
const {getWindow} = require('./util')

let start
let attributes
module.exports = {
  KeyPress ({buttons, keycode}) {
    global.keybindings.forEach(binding => {
      if (buttons === binding.buttons && keycode === binding.keycode) {
        exec(binding.cmd, console.log)
      }
    })
  },
  ButtonPress (event) {
    const {child} = event
    global.X.RaiseWindow(child)
    global.currentWorkspace.currentWindow = getWindow(child)
    Window.focus(global.currentWorkspace.currentWindow)
    if (!Workspace.contains(global.currentWorkspace, global.currentWorkspace.currentWindow)) {
      Workspace.addWindow(global.currentWorkspace, global.currentWorkspace.currentWindow)
    }
    global.X.GetGeometry(child, (error, attr) => {
      if (error) {
        console.error('get geometry error', error)
      }
      start = event
      attributes = attr
    })
  },
  MotionNotify ({rootx, rooty}) {
    if (!start) return
    const xdiff = rootx - start.rootx
    const ydiff = rooty - start.rooty
    start.keycode === 1 && start.buttons === keys.buttons.M && global.X.MoveWindow(
      start.child,
      attributes.xPos + (start.keycode === 1 ? xdiff : 0),
      attributes.yPos + (start.keycode === 1 ? ydiff : 0)
    )
    start.keycode === 3 && global.X.ResizeWindow(
      start.child,
      Math.max(1, attributes.width + (start.keycode === 3 ? xdiff : 0)),
      Math.max(1, attributes.height + (start.keycode === 3 ? ydiff : 0))
    )
  },
  ButtonRelease () {
    attributes = start = null
  },
  MapRequest (event) {
    global.X.GetWindowAttributes(event.wid, (error, attributes) => {
      if (error) return console.error(error)
      if (attributes[8]) {
        return global.X.MapWindow(event.wid)
      }
    })
    global.X.ChangeWindowAttributes(
      event.wid,
      {eventMask: x11.eventMask.EnterWindow}
    )
    const window = Window.create(event.wid)
    Workspace.addWindow(global.currentWorkspace, window)
  },
  FocusIn (event) {
    global.currentWorkspace.currentWindow = getWindow(event.wid)
    Window.focus(global.currentWorkspace.currentWindow)
  },
  EnterNotify (event) {
    const window = global.currentWorkspace.currentWindow = getWindow(event.wid)
    Window.focus(window)
  },
  ConfigureRequest ({wid, width, height}) {
    global.X.ResizeWindow(wid, width, height)
  },
  DestroyNotify ({wid}) {
    const window = getWindow(wid)
    // todo: if windows kept track of their workspace, this would not be necessary
    global.workspaces.forEach(workspace => Workspace.removeWindow(workspace, window))
  }
}
