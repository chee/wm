module.exports = class {
  constructor(X, id, parent, screen) {
    this.X = X
    this.id = id
    this.parent = parent
    this.screen = screen
  }

  show() {
    console.log('hello show')
    this.X.MapWindow(this.id)
  }

  hide() {
    this.X.UnmapWindow(this.id)
  }

  focus() {
    this.X.SetInputFocus(this.id)
  }

  kill() {
    this.X.DestroyWindow(id)
  }

  exec(callback) {
    callback(this)
  }
}
