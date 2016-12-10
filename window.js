const create = id => ({
  id,
  workspace: null,
  shown: false
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

export {create, show, hide, focus}
