const webpack = require('webpack')
const UglifyJSPlugin = require('uglifyjs-webpack-plugin')
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const ProgressBarPlugin = require('progress-bar-webpack-plugin')
const c = require('chalk')
const path = require('path')
const babelPolyfill = require.resolve('@babel/polyfill')
const fs = require('fs')
const formatWebpack = require('./formatWebpack')
const ReloadServer = require('./reloadServer')
const getEntry = require('./getEntry')
const getDirectories = require('./getDirectories')

let config = requireWithDefault(cwd('config.js'), false)
if (!config) {
  const OLD_PROJECT = getDirectories('.', /assets-built|assets-src/).length

  if (OLD_PROJECT) {
    config = {
      from: 'assets-src',
      to: 'assets-built',
    }
  } else {
    config = {
      from: 'src',
      to: 'dist'
    }
  }
}

ensureExist([config.from])

const entry = getEntry(cwd(config.from))


console.log(entry)


const WATCH = 'watch'
const PROD = 'production'
const DEV = 'development'  
const COMPILE = 'compile'

global['ENV'] = DEV
global['RELOAD'] = true 


async function compiler () {
 
  // Check following keys are set on global
  needs('ENV', 'RELOAD')

  // Setup vars
  const ENV = global.ENV === PROD ? PROD : DEV 
  const isDev = ENV === DEV
  const isProd = ENV === PROD
  const RELOAD = global.RELOAD

  console.log(c.magenta(`Running in ${ENV} mode\n`))
  let port = 12000
  
  if (RELOAD) {
    console.log('Starting reload server')
    port = await ReloadServer.getPort(port)
    console.log(port)
    await ReloadServer.start(port)
    console.log(`Reload server running on port ${port}`)
  }

  console.log(entry)
  console.log("that was the entry")

  const POST_CSS_OPTS = {
    ident: 'postcss',
    sourceMap: true,
    plugins: (loader) => [
      require('autoprefixer')(),
    ]
  }

  const webpackConfig = {
    entry,
    output: { 
      path: cwd(config.to),
      filename: '[name].min.js',
      devtoolModuleFilenameTemplate: info =>
      path.resolve(info.absoluteResourcePath).replace(/\\/g, '/')
    },
    context: process.cwd(),
    devtool: 'source-map',
    mode: ENV,
    module: {
      rules: [
        {
          test: /\.less$/,
          use: [
            { loader: MiniCssExtractPlugin.loader, },
            { loader: require.resolve('css-loader'), options: { importLoaders: 2, sourceMap: true, minimize: ENV !== DEV } },
            { loader: require.resolve('postcss-loader'), options: POST_CSS_OPTS },
            { loader: require.resolve('less-loader'), options: {sourceMap: true} }
          ]
        },
        {
          test: /\.(sa|sc|c)ss$/,
          use: [
            { loader: MiniCssExtractPlugin.loader },
            { loader: require.resolve('css-loader'), options: { importLoaders: 2, sourceMap: true, minimize: ENV !== DEV }},
            { loader: require.resolve('postcss-loader'), options: POST_CSS_OPTS },
            { loader: require.resolve('sass-loader'), options: { sourceMap: true }}
          ]
        },
        {
          test: /\.js$/,
          exclude: /node_modules/,
          loader: require.resolve("babel-loader"),
          options: {
            cacheDirectory: true,
            presets: [
              [
                require.resolve('@babel/preset-env'),
                { targets: { ie: 11 } }
              ]
            ],
            plugins: [
              require.resolve('babel-plugin-import-glob'),
              require.resolve('babel-plugin-transform-class-properties'),
              require.resolve('@babel/plugin-proposal-object-rest-spread'),
              require.resolve('babel-plugin-transform-flow-strip-types'),
            ]
          }
        },
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          loader: require.resolve("babel-loader"),
          options: {
            presets: [
              [
                require.resolve('@babel/preset-env'),
                { targets: { ie: 10 } }
              ]
            ],
            plugins: [
              require.resolve('babel-plugin-import-glob'),
              require.resolve('babel-plugin-transform-class-properties'),
              require.resolve('@babel/plugin-proposal-object-rest-spread'),
              require.resolve('babel-plugin-transform-typescript'),
            ]
          }
        },
        {
          test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
          use: [{
              loader: require.resolve('file-loader'),
              options: {
                  name: '[name].[ext]',
                  outputPath: 'fonts/'
              }
          }]
        }
      ]
    },
    resolve: {
      extensions: ['.js', '.ts'],
    },
    optimization: {
      splitChunks: {
        chunks: 'async',
        minSize: 30000,
        minChunks: 1,
        maxAsyncRequests: 5,
        maxInitialRequests: 3,
        automaticNameDelimiter: '~',
        name: true,
        cacheGroups: {
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            priority: -10
          },
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true
          }
        }
      },
      minimizer: joinArrays(
        isProd
        ? [ 
          new UglifyJSPlugin({
            sourceMap: true,
            test: /\.js($|\?)/i,
            uglifyOptions: {
              keep_classnames: true,
              keep_fnames: true,
            }
          }) 
        ] 
        : []
      )
    },
    plugins: [
      // new CleanWebpackPlugin([`dist/*`], {
      //   root: process.cwd(),
      //   dry: false,
      //   verbose: false,
      // }),
      new webpack.DefinePlugin({
        'process.env': {
          env: ENV,
          'REFRESH_PORT': port
        }
      }),
      new MiniCssExtractPlugin({
        filename: '[name].min.css',
        chunkFilename: ENV === DEV ? '[id].css' : '[id].[hash].css',
      }),
      new ProgressBarPlugin({
        format: `${c.red(':bar')}🚀  > :msg`,
        clear: true,
        complete: '🔥',
        width: 10,
        incomplete: new String(''),
        summary: false,
        customSummary: (t) => {
          console.log(c.yellow(`\nBuild took ${t}`))
        },
      }),
      new webpack.ExtendedAPIPlugin()
    ] 
  }


  // console.log(JSON.stringify(webpackConfig, null, 2))

  const compiler = webpack(webpackConfig)
  configHook('init', compiler, {ENV, RELOAD})

  console.log('will compile')

  if (ENV === DEV) {
    const watcher = compiler.watch({
      aggregateTimeout: 300, // wait so long for more changes
      poll: false // use polling instead of native watchers
    }, (err, stats) => {
      const { errors, warnings } = formatWebpack(stats.toJson(), true)

      if(errors.length){
        console.log(errors.join('\n\n'))
      }
      if(warnings.length){
        console.log(warnings.join('\n\n'))
      }

      if(RELOAD){
        ReloadServer.doRefresh()
      }

      if (config.postEmit && typeof config.postEmit === 'function') {
        configHook('postEmit', compiler, cwd())
      }
    })

    return watcher
  } else {
    compiler.run((err, stats) => {
      const { errors, warnings } = formatWebpack(stats.toJson(), true)

      if(warnings.length){
        console.log(warnings.join('\n\n'))
      }
      if(warnings.length){
        console.log(warnings.join('\n\n'))
      }
    })
  }
}

module.exports = compiler

function fileInDir(dir, regex){
  return path.resolve(dir, fs.readdirSync(dir).find(file => regex.test(file)))
}

function filesInDir(dir, regex){
  return fs.readdirSync(dir).filter(file => regex.test(file)).map(file => path.resolve(dir, file))
}

function joinArrays(...arr){
  return [].concat(...arr)
}

function exists(arr){
  return arr.filter(p => fs.existsSync(p))
}

function requireWithDefault(path, defa){
  try{
    return require(path0 || defa)
  }catch(e){
    return defa
  }
}

function needs(...args){
  const keys = Object.keys(global)
  args.forEach(arg => {
    if(!keys.includes(arg)){
      throw new Error(`global did not have property [${arg}] setup`)
    }
  })
}

function clone(...args){
  return Object.assign({}, ...args)
}

function sep(str){
  if(path.sep === '/') return str
  return str.replace(/\//g, path.sep)
}

function ensureExist(places){
  places.forEach(place => {
    console.log('looking for ', place)
    if (!fs.existsSync(cwd(place))) {
      throw new Error(`${place} does not exist. Try adding a config.js to your project. Eg.

{
  from: 'src',
  to: 'dist'
}`)
    }
  })
}

function cwd(...args){
  if (!args.length) return process.cwd()
  return path.join(process.cwd(), ...args)
}

function configHook(name, ...args){
  if (config.events && config.events[name] && typeof config.events[name] === 'function') {
    return config.events[name](...args)
  }
}