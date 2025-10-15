import http from 'http'
import fs from 'fs'
import path from "path"

import { fileURLToPath } from "url"
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const opts = { port: 8000, host: 'localhost', root: '/' }

function onrequest(req, res) {
  let url = req.url
  if (url === '/') url = '/index.html'
  const filePath = path.join(__dirname, opts.root, url)
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('404 Not Found')
      return
    }
    let contentType = 'text/html'
    if (filePath.endsWith('.css')) contentType = 'text/css'
    else if (filePath.endsWith('.js')) contentType = 'application/javascript'
    else if (filePath.endsWith('.png')) contentType = 'image/png'
    else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) contentType = 'image/jpeg'
    else if (filePath.endsWith('.gif')) contentType = 'image/gif'
    else if (filePath.endsWith('.svg')) contentType = 'image/svg+xml'
    else if (filePath.endsWith('.mp3')) contentType = 'audio/mpeg'
    res.writeHead(200, { 'Content-Type': contentType })
    res.end(data)
  })
}

export default {
  deploy: (options) => {
    Object.assign(opts, options)
    http.createServer(onrequest).listen(opts.port, opts.host)
  }
}
