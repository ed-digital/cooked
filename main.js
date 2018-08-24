const compile = require('./webpack')

const DEV = 'development'
const PROD = 'production'

const type = x => ({dev: DEV, prod: PROD}[x])

function main(cmd){
  // Defaults
  global.RELOAD = true
  global.ENV = DEV

  if (cmd) {
    global.ENV = type(cmd._name)
    global.RELOAD = cmd.reload || true
  }

  compile()
}

module.exports = main