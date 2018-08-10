import './reloadStyles.less';

;(function(){
  if (window.HAS_REFRESH_HANDLED) return
  window.HAS_REFRESH_HANDLED = true
  
  const log = console.log
  var tag = false
  var tm = false
  var disconnected = false
  function addTo(arr){
    return item => arr.push(item)
  }
  function toArray(nodeList){
    const result = []
    nodeList.forEach(addTo(result))
    return result
  }
  function parseQuery(url){
    const result = {}
    const q = url.split('?')[1] || ''
    const pairs = q.split('&').forEach(pair => {
      const p = pair.split('=')
      result[p[0]] = p[1]
    })
    return result
  }
  function escapeRegExp(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
  }
  function createQuery(obj){
    return '?' + Object.entries(obj).map((keyVal) => {
      return keyVal.join('=')
    }).join('&')
  }
  function addTag(){
    if(tag) return 
    tag = document.createElement('div')
    tag.className = 'DEV_REFRESH-style-modal'
    tag.textContent = 'Styles were updated'
    document.body.append(tag)
  }
  function fileName(str){
    return str.split('\\').pop().split('/').pop().split('.').shift()
  }
  function initSocket(){
    return new Promise(resolve => {
      var ws = new WebSocket('ws://127.0.0.1:' + process.env.REFRESH_PORT)
      ws.onopen = () => {
        log('%cConnected to dev server', 'color: #9c55da')

        if(disconnected){
          window.location.reload()
        }
        resolve(true)
      }
      ws.addEventListener('message', function(msg){
        var data = JSON.parse(msg.data)
        var type = data.type

        if (type === 'all') {
          log('%cDetected code changes! Reloading page.', 'color: #9c55da')
          localStorage.setItem('wasDevReloaded', true)
          window.location.reload()
        }

        if(type === 'style'){
          log('%cDetected style change! Reloading styles.', 'color: #9c55da')
          addTag()
          tag.style = `transform: translateX(0);`
          clearTimeout(tm)
          tm = setTimeout(() => {
            tag.style = ``
          }, 2200)

          const links = toArray(document.querySelectorAll('link[rel="stylesheet"]'))
          links.forEach(el => {
            const href = el.getAttribute('href')
            const isFromDist = /dist/.test(href)
            if(isFromDist){
              const url = href.split('?')[0]
              const query = parseQuery(href)
              query.ver = query.ver ? Number(query.ver) + 1 : 1
              el.setAttribute('href', url + createQuery(query))
            }
          })

          const styleTags = toArray(document.querySelectorAll('style[type="text/css"]'))
          styleTags.forEach(el => {
            let html = el.innerHTML
            const imports = html.split('\n').filter(str => /\@import.*?url.*?\(/.test(str))
            const importsToUpdate = imports.filter(str => str.includes(window.location.host))
            importsToUpdate.forEach(imp => {
              const url = imp.replace(/\@import *?url *?\( *?("|')|("|')\);/g, '')
              let [baseUrl, query] = url.split('?')
              if (Number(query)) {
                query = Number(query) + 1
              } else {
                query = 1
              }
              const newUrl = baseUrl + '?' + query
              const newHtml = html.replace(url, newUrl)
              el.innerHTML = newHtml
            })
          })
        }
      })
      ws.onerror = function() {
        log('%cError connecting to dev reload server, you may need to refresh manually!', 'color: #da6955')
        disconnected = true
        
        let interval = setTimeout(() => {
          resolve(initSocket())
        }, 1500)
      }

      ws.onclose = function(){
        log('%Lost connection to compiler, trying to reconnect automatically!', 'color: #da6955')
        disconnected = true

        let interval = setTimeout(() => {
          resolve(initSocket())
        }, 2000)
      }
    })
  }
  try {
    if (localStorage.getItem('wasDevReloaded')) {
      log('%cPage was reloaded automatically because of a code change.', 'color: #9c55da')
      localStorage.removeItem('wasDevReloaded')
    }
    if (/((\.dev|\.local|)$|localhost)/.test(window.location.host) && window.WebSocket) {
      initSocket()
    }
  } catch(err) {
    log("Dev refresh error", err)
  }
  })()