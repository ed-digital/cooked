function print(...args){
  const log = args.map(arg => {
    if(typeof arg === 'object'){
      return JSON.stringify(arg, censor(), 2)
    }
    return arg
  })

  console.log(...log)
}

function censor() {
  const obj = []

  return function(key, value) {
    if (typeof value === 'object' && value !== null) {
      if (obj.includes(value)) {
        return '[Circular]'; 
      } else {
        obj.push(value)
      }
    }

    return value;  
  }
}

module.exports = print