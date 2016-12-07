const Window = require('./window')

module.exports = class {
  constructor(X, screen) {
    this.X = X
    this.screen = screen
    this.root = screen.root
    this.focused = null
    this.windows = []
  }

  addWindow(id) {
    const window = new Window(this.X, id)
    this.windows.push(window)
    window.show()
  }

  show() {
    if (this.focused) {
      this.focused.focus()
    } else {
      //this.X.SetInputFocus(this.root)
    }
    this.windows.forEach(window => window.show())
  }

  hide() {
    this.windows.forEach(window => window.hide())
  }
}
