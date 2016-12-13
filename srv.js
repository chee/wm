const fs = require('fs')
const net = require('net')

var path = process.env.XEPHYR ? '/tmp/wm.xephyr' : '/tmp/wm'

module.exports = eventEmitter => {
  fs.unlink(path, () => {
    const server = net.createServer(connection => {
      connection.on('data', data => {
        const match = data.toString().match(/^(\S+)\s*(\S*)\s*(\S*)/)
        if (!match) return
        const [, target, method, message] = match
        eventEmitter.emit('cmd', {target, method, message})
      })
    }).listen(path, () => {
      console.log('server bound on %s', path)
    })
    eventEmitter.on('die', () => server.close())
  })
}
