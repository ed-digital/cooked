const {lstatSync, existsSync, readdirSync} = require('fs')
const {join, resolve} = require('path')

const isDirectory = source => lstatSync(source).isDirectory()
const getDirectories = (source, regex) => {
  const dirs = readdirSync(source).filter(name => isDirectory(join(source, name)))
  if(!regex){
    return dirs
  } else {
    return dirs.filter(str => regex.test(str))
  }
}

module.exports = getDirectories