#! /usr/bin/env node

const app = require('commander')
const main = require('../main')

let caught = false

app
  .version('1.0.0')

app
  .command('prod')
  .option('-w, --watch', "Watch")
  .action(runner(main))

app
  .command('dev', {isDefault: true})
  .option('-r --reload', "Disable auto reload")
  .action(runner(main))

app.on('command:*', runner(() => {
  console.error('Invalid command: %s\nSee --help for a list of available commands.', app.args.join(' '))
}))

function runner(fn){
  return (...args) => {
    caught = true
    fn(...args)
  }
}

app.parse(process.argv)

if(!caught){
  main()
}
