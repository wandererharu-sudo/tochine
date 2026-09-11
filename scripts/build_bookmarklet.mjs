import fs from 'node:fs'
// 改行は維持してエンコードし、コメントによる後続コードの無効化を防ぐ。
const code = fs.readFileSync('scripts/bookmarklet.js', 'utf8')
const bookmarklet = 'javascript:' + encodeURIComponent(code)
fs.writeFileSync('scripts/bookmarklet.min.txt', bookmarklet + '\n')
let html = fs.readFileSync('public/bookmarklet.html', 'utf8')
html = html.replace(/href="javascript:[^"]*"/, 'href="' + bookmarklet + '"')
  .replace(/(<textarea[^>]*>)[\s\S]*?(<\/textarea>)/, '$1' + bookmarklet + '$2')
fs.writeFileSync('public/bookmarklet.html', html)
