const keys = require('./lib/keys')

const or = (previous, current) => previous | current

// todo: this could be less gross
const stringToKeys = string => ({
  buttons: string.split('-').map(key => keys.buttons[key]).reduce(or, 0),
  keycode: string.split('-').map(key => keys.keycodes[key]).reduce(or, 0)
})

const mapObject = (object, func) => {
  const resultant = {}
  for (const key in object) {
    resultant[key] = func(key, object[key])
  }
  return resultant
}

const constrainNumber = (number, max, min = 0) => (
  Math.max(Math.min(number, max), min)
)

module.exports = {
  stringToKeys,
  or,
  mapObject,
  constrainNumber
}
