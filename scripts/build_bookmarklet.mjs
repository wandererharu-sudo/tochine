import fs from 'node:fs'
// 改行は維持してエンコードし、コメントによる後続コードの無効化を防ぐ。
// 日本語は \uXXXX にしてASCIIだけにする。Chromeはブックマークから実行する時に一部の文字を戻さないため（2026-10-17 HOME'S）
const code = fs.readFileSync('scripts/bookmarklet.js', 'utf8')
  .replace(/[^\x00-\x7f]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'))
const bookmarklet = 'javascript:' + encodeURIComponent(code)
fs.writeFileSync('scripts/bookmarklet.min.txt', bookmarklet + '\n')
let html = fs.readFileSync('public/bookmarklet.html', 'utf8')
html = html.replace(/href="javascript:[^"]*"/, 'href="' + bookmarklet + '"')
  .replace(/(<textarea[^>]*>)[\s\S]*?(<\/textarea>)/, '$1' + bookmarklet + '$2')
fs.writeFileSync('public/bookmarklet.html', html)
