
const Marked = require('marked')


module.exports = function htmlToMarkdown(content, title = 'title') {
  const markdown = Marked(content.toString())

  const template =
  `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8"/>
    <title>${title}</title>
    <link rel="stylesheet" href="./assets/style.css">
  </head>
  <body>
    ${markdown}
  </body>
  </html>
  `

  return template
}
