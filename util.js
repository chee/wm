const keys = require('./lib/xkeys')

const or = (previous, current) => previous | current

// todo: this could be less gross
const stringToKeys = string => ({
  buttons: string.split('-').map(key => keys.buttons[key]).reduce(or, 0),
  keycode: string.split('-').map(key => keys.keycodes[key]).reduce(or, 0)
})

module.exports = {
  stringToKeys,
  or
}
