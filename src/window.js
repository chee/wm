const create = id => ({
  id,
  shown: false,
  pinned: false
})

const show = window => {
  if (!window) return
  global.X.MapWindow(window.id)
  window.shown = true
}

const hide = window => {
  if (!window) return
  global.X.UnmapWindow(window.id)
  window.shown = false
}

const focus = window => {
  global.X.SetInputFocus(window.id)
}

const togglePinning = window => {
  window.pinned = !window.pinned
}

module.exports = {create, show, hide, focus, togglePinning}
