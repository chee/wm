const fs = require('fs')
const net = require('net')

var path = '/tmp/wm'

module.exports = eventEmitter => {
  fs.unlink(path, () => {
    const server = net.createServer(connection => {
      connection.on('data', data => {
        eventEmitter.emit('cmd', data.toString())
      })
    }).listen(path, () => {
      console.log('server bound on %s', path)
    })
    eventEmitter.on('die', () => server.close())
  })
}
