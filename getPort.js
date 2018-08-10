const net = require('net')

function getPort (port) {
  return new Promise(resolve => {
    const server = net.createServer()

    server.listen({
      host: 'localhost',
      port,
      exclusive: true
    })

    server.on('listening', (...args) => {
      server.once('close', function () {
        setTimeout(() => {
          resolve(port)
        }, 200)
      })
      server.close()
    })

    server.once('error', () => {
      getPort(++port).then(newPort => resolve(newPort))
    })
  })
}

module.exports = getPort