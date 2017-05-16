const keys = require('../lib/keys')
const Window = require('./window')

const or = (previous, current) => previous | current

// todo: this could be less gross
const stringToKeys = string => ({
  buttons: string.split('-').map(key => keys.buttons[key]).reduce(or, 0),
  keycode: string.split('-').map(key => keys.keycodes[key]).reduce(or, 0)
})

const mapObject = (object, func) => {
  const resultant = {}
  for (const key in object) {
    resultant[key] = func(key, object[key])
  }
  return resultant
}

const constrainNumber = (number, max, min = 0) => (
  Math.max(Math.min(number, max), min)
)

const setupKeybindings = keybindingConfig => {
  const bindings = []
  mapObject(keybindingConfig, (binding, cmd) => (
    bindings.push(Object.assign({}, {cmd}, stringToKeys(binding)))
  ))
  return bindings
}

// todo: maybe these should live somewhere else. WM.?
const getAllWindows = () => (
  global.workspaces.map(workspace => (
    workspace.windows
  )).reduce((previous, current) => (
    previous.concat(current)
  ))
)

const getWindow = id => (
  getAllWindows().filter(window => window.id === id)[0] || Window.create(id)
)

module.exports = {
  stringToKeys,
  or,
  mapObject,
  constrainNumber,
  setupKeybindings,
  getAllWindows,
  getWindow
}
