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
    this.windows.push(id)
  }

  show() {
    if (this.focused) {
      this.focused.focus()
    } else {
      //this.X.SetInputFocus(this.root)
    }
    this.windows.forEach(id => new Window(this.X, id).show())
  }

  hide() {
    this.windows.forEach(id => new Window(this.X, id).hide())
  }
}
