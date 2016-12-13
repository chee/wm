const fs = require('fs')
const net = require('net')

module.exports = ({name, emitter}) => {
  // todo: make this more generic
  const path = process.env.XEPHYR ? `/tmp/${name}.xephyr` : `/tmp/${name}`

  fs.unlink(path, () => {
    const server = net.createServer(connection => {
      connection.on('data', data => {
        const match = data.toString().match(/^(\S+)\s*(\S*)\s*(\S*)/)
        if (!match) return
        const [, target, method, message] = match
        emitter.emit('cmd', {target, method, message})
      })
    }).listen(path, () => {
      console.log('server bound on %s', path)
    })
    emitter.on('die', () => server.close())
  })
}
