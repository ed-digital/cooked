const express = require('express')
const expressWS = require('express-ws')
const getPort = require('./getPort')
const chokidar = require('chokidar')
const c = require('chalk')

class DevRefreshServer {
  
  constructor () {
    this.client = require.resolve('./reloadClient')
    this.sockets = []
    this.update = false
  }
  
  start (port, base = 'src') {
    console.log(base)
    return new Promise(async resolve => {

      chokidar.watch([
        `${base}/**/*.js`,
        `${base}/**/*.sass`,
        `${base}/**/*.scss`,
        `${base}/**/*.less`,
        `${base}/**/*.php`,
      ], {
        ignored: /(assets-built|dist|node_modules|.git-ignore)/,
        persistent: true,
        ignoreInitial: true
      }).on('all', (event, path) => {

        const hasStyle = /(c|sa|le)ss/.test(path)
        
        if(!this.update && hasStyle){
          this.update = 'style'
        }else{
          this.update = 'all'
        }
      })

      this.app = express()
      expressWS(this.app)
      
      this.app.ws('/', (ws, req) => {
        ws.on('open', () => {
          console.log('Opened')
        })
        ws.on('close', () => {
          this.sockets = this.sockets.filter(o => o !== ws)
        })
        this.sockets.push(ws)
      })
      
      this.port = port
      this.app.listen(this.port, '127.0.0.1', () => resolve(this.app))
    })
  }

  getPort(...args){
    return getPort(...args)
  }
  
  doRefresh () {
    if(!this.update) return
    console.log(c.magenta(`Sending ${this.update === 'style' ? 'new styles' : 'refresh'} to client`))
    for (let ws of this.sockets) {
      ws.send(JSON.stringify({
        type: this.update,
      }))
    }
    this.update = false
  }
}

const Server = new DevRefreshServer()

module.exports = Server