const path = require('path')
const fs = require('fs')
const chalk = require('chalk')
const babelPolyfill = require.resolve('@babel/polyfill')
const ReloadServer = require('./reloadServer')

function getEntry (dir) {

  const base = dir
  const styles = filesInDir(base, /\.(sc|sa|le|c)ss$/)
  const js = filesInDir(base, /\.(j|t)s$/)

  if (!styles.length) console.log(chalk.yellow( `No styles found in ${dir}` ))
  if (!js.length) {
    console.error(chalk.red(`No js found in ${dir}... \nGiving up`))
    process.exit()
  }


  function singleEntries(arr){
    return arr.reduce((acc, entry) => {

      // converts "[key]" ==> obj[key]
      // const string = template({
      //   name: filename(entry),
      //   ext: type,
      // })

      // sep makes sure the string is using the correct path seperators
      // const toPath = sep(string)
      acc[filename(entry)] = entry
      return acc
    }, {})
  }

  return clone(
    jsDeps(singleEntries(js, 'js')),
    singleEntries(styles, 'css'), 
  )
}

module.exports = getEntry 

function jsDeps(js){
  const isDev = global.ENV === 'development'

  const deps = Object.entries(js).reduce((acc, [name, src]) => {
    acc[name] = prepend(
      Array.isArray(src) ? src : [src],
      // Not empty removes ReloadServerClient on prod
      notEmpty([
        babelPolyfill,
        isDev && ReloadServer.client
      ])
    )
    
    return acc
  }, {})

  return deps

  return js
}

function template(str, obj){
  const regex = new RegExp(
    Object.keys(obj)
    .map(str => `[${str}]`)
    .join('|'),
    'g'
  )

  return str.replace(regex, (selection) => obj[selection])
}

function clone (...args) {
  console.log(args)
  return Object.assign({}, ...args)
}

function filesInDir (dir, regex) {
  return fs.readdirSync(dir).filter(file => regex.test(file)).map(file => path.resolve(dir, file))
}

function notEmpty (arr) {
  return arr.filter(Boolean)
}

function filename (str) {
  return str.split('/').pop().split('\\').pop().split('.').shift()
}
function filetype (str) {
  return str.split('.').pop()
}

function flatten (arr1) {
  return arr1.reduce((acc, val) => Array.isArray(val) ? acc.concat(flatten(val)) : acc.concat(val), []);
}

function prepend (arr, ...items) {
  return [].concat(flatten(items), arr)
}
function sep(str){
  if(path.sep === '/') return str
  return str.replace(/\//g, path.sep)
}