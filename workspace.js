const Window = require('./window')

module.exports = class {
  constructor(screen) {
    this.screen = screen
    this.root = screen.root
    this.focused = null
    this.windows = []
  }

  addWindow(id) {
    const window = new Window(id)
    this.windows.push(window)
    window.show()
  }

  removeWindow(id) {
    this.windows = this.windows.filter(window => window.id != id)
  }

  show() {
    if (this.focused) {
      this.focused.focus()
    } else {
      global.X.SetInputFocus(this.root)
    }
    this.windows.forEach(window => window.show())
  }

  hide() {
    this.windows.forEach(window => window.hide())
  }

  contains(id) {
    return this.windows.some(window => window.id == id)
  }

  mapWindow(func) {
    return this.windows.map(func)
  }
}
