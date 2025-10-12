import pug from "pug"
import stylus from "stylus"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { dirname } from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const directories = [process.env.source_dir, process.env.build_dir]

const sources = [
  { type: 'pug', files: ['index.pug', 'index.html'] },
  { type: 'stylus', files: ['app.styl', 'app.css'] }
]
  .map(({ type, files }) => {
    return {
      type,
      files: files.map(
        (file, key) => path.join(__dirname, directories[key], file)
      )
    }
  })
  .forEach(({ type, files }) => {
    if (type === 'pug') {
      const html = pug.renderFile(files[0], { pretty: true })
      fs.writeFileSync(files[1], html)
    }
    if (type === 'stylus') {
      const styl = fs.readFileSync(files[0], 'utf8')
      stylus(styl)
        .set('filename', files[0])
        .set('compress', true)
        .render((err, css) => {
          if (err) throw err
          fs.writeFileSync(files[1], css)
        })
    }
  })
