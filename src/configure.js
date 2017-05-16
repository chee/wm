const {setupKeybindings} = require('./util')
const keys = require('../lib/keys')
const Workspace = require('./workspace')
const x11 = require('x11')

const ASYNC = 1
const NOPE = 0

function grabKeys (X, bindings) {
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
function grabButtons (X) {
  X.GrabButton(
    global.root, true, x11.eventMask.ButtonPress | x11.eventMask.ButtonRelease | x11.eventMask.PointerMotion,
    ASYNC, ASYNC, NOPE, NOPE, 1, keys.buttons.M
  )
  X.GrabButton(
    global.root, true, x11.eventMask.ButtonPress | x11.eventMask.ButtonRelease | x11.eventMask.PointerMotion,
    ASYNC, ASYNC, NOPE, NOPE, 3, keys.buttons.M
  )
}

function makeWorkspaces (size) {
  const workspaces = []
  for (let id = 0; id < size; id++) {
    global.workspaces && global.workspaces[id]
    ? workspaces.push(global.workspaces[id])
    : workspaces.push(Workspace.create(id))
  }
  return workspaces
}

module.exports = function () {
  const configuration = require('../lib/configuration')

  // todo: ungrab old keys
  global.keybindings = setupKeybindings(configuration.keybindings)

  grabKeys(global.X, global.keybindings)
  grabButtons(global.X)

  global.workspaces = makeWorkspaces(
    configuration.settings && configuration.settings.workspaces
    ? configuration.settings.workspaces
    : 5
  )

  global.X.ChangeWindowAttributes(global.root, {
    eventMask: x11.eventMask.SubstructureNotify |
    x11.eventMask.SubstructureRedirect |
    x11.eventMask.ResizeRedirect |
    x11.eventMask.Exposure |
    x11.eventMask.MapRequest |
    x11.eventMask.EnterWindow |
    x11.eventMask.FocusChange
  }, console.error)
}
