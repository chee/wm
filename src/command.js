const Window = require('./window')
const Workspace = require('./workspace')
const {constrainNumber, getAllWindows} = require('./util')
const configure = require('./configure')

module.exports = {
  wm: { reload: configure },
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
    workspace(id) {
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
      const {pixel_width, pixel_height} = global.screen
      let match = null
      if (direction == 'left' || direction == 'right') {
        global.X.ResizeWindow(id, pixel_width / 2, pixel_height)
        direction == 'left'
        ? global.X.MoveWindow(id, 0, 0)
        : global.X.MoveWindow(id, pixel_width / 2, 0)
      } else if ((match = direction.match(/^(top)-(\w+)/)) || (match = direction.match(/^(bottom)-(\w+)/))) {
        const [, vertical, horizontal] = match
        global.X.ResizeWindow(id, pixel_width / 2, pixel_height / 2)
        vertical == 'top'
        ? horizontal == 'left' ? global.X.MoveWindow(id, 0, 0) : global.X.MoveWindow(id, pixel_width / 2, 0)
        : horizontal == 'left' ? global.X.MoveWindow(id, 0, pixel_height / 2) : global.X.MoveWindow(id, pixel_width / 2, pixel_height / 2)
      } else if (direction == 'full') {
        global.X.ResizeWindow(id, pixel_width, pixel_height)
        global.X.MoveWindow(id, 0, 0)
      }
    },
    // todo: constrain these to a grid
    // todo: dry these up
    resize(arg) {
      const id = global.currentWorkspace.currentWindow.id
      const match = arg.match(/(x|y)(\+|-)(\d+)/)
      if (!match) return
      const [, axis, operation, percent] = match
      const signedPercent = Number(`${operation}${percent}`)
      const {pixel_width, pixel_height} = global.screen
      global.X.GetGeometry(id, (error, attributes) => {
        const {width, height} = attributes
        global.X.ResizeWindow(global.currentWorkspace.currentWindow.id,
          axis == 'x' ? width + (pixel_width / 100 * signedPercent) : width,
          axis == 'y' ? height + (pixel_height / 100 * signedPercent) : height
        )
      })
    },
    move(arg) {
      const id = global.currentWorkspace.currentWindow.id
      const match = arg.match(/(x|y)(\+|-)(\d+)/)
      if (!match) return
      const [, axis, operation, percent] = match
      const signedPercent = Number(`${operation}${percent}`)
      const {pixel_width, pixel_height} = global.screen
      global.X.GetGeometry(id, (error, attributes) => {
        global.X.MoveWindow(global.currentWorkspace.currentWindow.id,
          axis == 'x' ? attributes.xPos + (pixel_width / 100 * signedPercent) : attributes.xPos,
          axis == 'y' ? attributes.yPos + (pixel_height / 100 * signedPercent) : attributes.yPos
        )
      })
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
