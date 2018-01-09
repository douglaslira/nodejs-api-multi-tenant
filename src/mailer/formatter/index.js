import hogan from 'hogan.js'
import i18n from 'i18n'
import fs from 'fs'
import path from 'path'

import Formatter from './formatter'

i18n.configure({
  locales: ['en', 'ar', 'ku'],
  defaultLocale: 'en',
  objectNotation: true,
  updateFiles: process.env.NODE_ENV !== 'production',
  directory: path.join(__dirname, 'locales')
})

const templatesDir = path.join(__dirname, 'templates')
const templates = {}

fs.readdirSync(templatesDir).forEach(file => {
  templates[path.basename(file, '.hjs')] = hogan.compile(
    fs.readFileSync(path.join(templatesDir, file), 'utf8')
  )
})

const stylesheetsDir = path.join(__dirname, 'css')
const stylesheets = {}

fs.readdirSync(stylesheetsDir).forEach(file => {
  stylesheets[path.basename(file, '.css')] = fs.readFileSync(
    path.join(stylesheetsDir, file),
    'utf8'
  )
})

export default new Formatter(templates, stylesheets, i18n)
