const Window = require('./window')

const create = id => ({
  id,
  windows: [],
  currentWindow: null
})

// todo: this should throw if there's no window
const addWindow = (workspace, window) => {
  if (!window) return
  workspace.windows.push(window)
  Window.show(window)
}

// todo: this should throw if there's no window
const removeWindow = (workspace, window) => {
  if (!window) return
  const {id} = window
  workspace.windows = workspace.windows.filter(window => window.id !== id)
}

const show = workspace => {
  workspace.currentWindow
    ? Window.focus(workspace.currentWindow)
    : global.X.SetInputFocus(global.root)
  workspace.windows.forEach(Window.show)
}

const hide = workspace => {
  workspace.windows.forEach(Window.hide)
}

const contains = (workspace, window) => {
  const {id} = window
  return workspace.windows.some(window => window.id === id)
}

module.exports = {create, addWindow, removeWindow, show, hide, contains}
