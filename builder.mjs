import 'consolecolors'
import chokidar from 'chokidar'
import livereload from 'livereload'
import pug from 'pug'
import stylus from 'stylus'
import fs from 'fs'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import HTTPServer from './dev-server.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const directories = [process.env.source_dir, process.env.build_dir]

const dispatcher = filePath => {
  const ext = path.extname(filePath)
  const file = path.basename(filePath, ext)
  if (ext === '.styl') return buildStylus(file)
  if (ext === '.pug') return buildPug(file)
  if (ext === '.js') return copyJS(file)
}

const buildStylus = file => {
  console.log(' - Building Stylus...'.magenta)
  const files = [
    path.join(__dirname, directories[0], `${file}.styl`),
    path.join(__dirname, directories[1], `${file}.css`)
  ]
  const styl = fs.readFileSync(files[0], 'utf8')
  stylus(styl)
    .set('filename', files[0])
    .set('compress', true)
    .render((err, css) => {
      if (err) throw err
      fs.writeFileSync(files[1], css)
    })
}

const buildPug = file => {
  console.log(' - Building Pug...'.magenta)
  const files = [
    path.join(__dirname, directories[0], `${file}.pug`),
    path.join(__dirname, directories[1], `${file}.html`)
  ]
  const html = pug.renderFile(files[0], { pretty: false })
  fs.writeFileSync(files[1], html)
}

const copyJS = file => {
  console.log(' - Copying JavaScript...'.magenta)
  const files = [
    path.join(__dirname, directories[0], `${file}.js`),
    path.join(__dirname, directories[1], `${file}.js`)
  ]
  fs.copyFileSync(files[0], files[1])
}

const copyAssets = () => {
  console.log(' - Copying assets...'.magenta)
  const source = path.join(__dirname, 'assets')
  const dest = path.join(__dirname, directories[1], 'assets')
  if (!fs.existsSync(dest)) fs.mkdirSync(dest)
  fs.readdirSync(source).forEach(file => {
    fs.copyFileSync(path.join(source, file), path.join(dest, file))
  })
}

if (!fs.existsSync(path.join(__dirname, directories[1]))) {
  fs.mkdirSync(path.join(__dirname, directories[1]))
}

// Only build once if not in development mode
if (process.env.NODE_ENV !== 'development') {
  console.log('Building project...'.green)
  fs.readdirSync(path.join(__dirname, directories[0]))
    .filter(file => ['.styl', '.pug', '.js'].includes(path.extname(file)))
    .forEach(dispatcher)
  copyAssets()
  console.log(
    fs.readdirSync(path.join(__dirname, directories[1]))
      .map(f => ` - ${f}`).join('\n').green
  )
  console.log(path.join(__dirname, directories[1]))
  console.log('Build complete.'.green)
  process.exit(0)
}

const server = livereload.createServer()
server.watch(path.join(__dirname, directories[1]))
HTTPServer.deploy({ port: 8001, root: directories[1] })
console.log('Livereload running at'.green, 'http://localhost:35729'.magenta)
console.log('Server running at'.green, 'http://localhost:8001'.magenta)
console.log('Watching for changes...'.yellow)
copyAssets()

const watcher = chokidar.watch(directories[0], {
  ignored: /(^|[/\\])\../
})

watcher.on('add', dispatcher)
watcher.on('change', dispatcher)
