const fs = require('fs');
const path = require('path');

const root = __dirname;
const files = [];
(function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git') continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (name.endsWith('.html')) files.push(p);
  }
})(root);

let changed = 0;
for (const file of files) {
  let html = fs.readFileSync(file, 'utf8');
  if (html.includes('count-up-all.js')) continue;
  const idx = html.lastIndexOf('</body>');
  if (idx === -1) { console.log('NO </body>:', file); continue; }
  const rel = path.relative(path.dirname(file), path.join(root, 'js', 'count-up-all.js')).split(path.sep).join('/');
  const tag = `  <script defer src="${rel}"></script>\n`;
  html = html.slice(0, idx) + tag + html.slice(idx);
  fs.writeFileSync(file, html);
  changed++;
}
console.log('Injected into', changed, 'of', files.length, 'files');
