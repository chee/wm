const create = id => ({
  id,
  workspace: null,
  shown: false,
  focused: false
})

const show = window => {
  global.X.MapWindow(window.id)
  window.shown = true
}

const hide = window => {
  global.X.UnmapWindow(window.id)
  window.shown = false
}

const focus = window => {
  global.X.SetInputFocus(window.id)
  // todo: how does this get unset
  // is it even the job of the window to maintain this?
  window.focused = true
}

export {create, show, hide, focus}
