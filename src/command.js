const Window = require('./window')
const Workspace = require('./workspace')
const {constrainNumber, getAllWindows} = require('./util')

module.exports = {
  workspace: {
    switch(id) {
      const target = global.workspaces[constrainNumber(id - 1, global.workspaces.length)]
      if (global.currentWorkspace.id == target.id) return
      getAllWindows().filter(window => !window.pinned).forEach(Window.hide)
      global.currentWorkspace = target
      Workspace.show(global.currentWorkspace)
    }
  },
  window: {
    destroy() {
      global.X.DestroyWindow(global.currentWorkspace.currentWindow.id)
    },
    move(id) {
      const window = global.currentWorkspace.currentWindow
      const target = global.workspaces[constrainNumber(id - 1, global.workspaces.length)]
      if (target.id == global.currentWorkspace.id) return
      Workspace.removeWindow(global.currentWorkspace, window)
      Workspace.addWindow(target, window)
      Window.hide(window)
      global.currentWorkspace.currentWindow = null
    },
    tile(direction) {
      const id = global.currentWorkspace.currentWindow.id
      if (direction == 'left' || direction == 'right') {
        global.X.ResizeWindow(id, global.screen.pixel_width / 2, global.screen.pixel_height)
        direction == 'left'
        ? global.X.MoveWindow(global.currentWorkspace.currentWindow.id, 0, 0)
        : global.X.MoveWindow(global.currentWorkspace.currentWindow.id, global.screen.pixel_width / 2, 0)
      } else if (direction == 'full') {
        global.X.ResizeWindow(global.currentWorkspace.currentWindow.id, global.screen.pixel_width, global.screen.pixel_height)
        global.X.MoveWindow(global.currentWorkspace.currentWindow.id, 0, 0)
      }
    },
    'toggle-pinning'() {
      const workspace = global.currentWorkspace
      const window = workspace.currentWindow
      if (window.id == global.root.id) return
      global.workspaces.forEach(workspace => {
        Workspace.removeWindow(workspace, window)
      })
      Workspace.addWindow(workspace, window)
      window.pinned = !window.pinned
      window.pinned && global.workspaces.forEach(workspace => {
        workspace.currentWindow = window
      })
    }
  }
}
