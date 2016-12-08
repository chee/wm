module.exports = class {
  constructor(id, parent, screen) {
    this.id = id
    this.parent = parent
    this.screen = screen
  }

  show() {
    global.X.MapWindow(this.id)
  }

  hide() {
    global.X.UnmapWindow(this.id)
  }

  focus() {
    global.X.SetInputFocus(this.id)
  }

  kill() {
    global.X.DestroyWindow(this.id)
  }

  exec(callback) {
    callback(this)
  }
}
