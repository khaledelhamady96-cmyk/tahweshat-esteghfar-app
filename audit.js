const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, 'public', 'app.js'), 'utf8');

const regex = /document\.getElementById\(['"]([^'"]+)['"]\)/g;
let match;
const ids = new Set();
while ((match = regex.exec(js)) !== null) {
  ids.add(match[1]);
}

console.log('Total getElementById queries in app.js:', ids.size);
const missing = [];
for (const id of ids) {
  const hasId = html.includes(`id="${id}"`) || html.includes(`id='${id}'`);
  if (!hasId) {
    missing.push(id);
    console.log('❌ MISSING IN HTML:', id);
  } else {
    // console.log('✔ FOUND:', id);
  }
}
if (missing.length === 0) {
  console.log('All IDs found in public/index.html!');
}

// Now let's check android/app/src/main/assets/public/index.html
const androidHtml = fs.readFileSync(path.join(__dirname, 'android', 'app', 'src', 'main', 'assets', 'public', 'index.html'), 'utf8');
const androidMissing = [];
for (const id of ids) {
  const hasId = androidHtml.includes(`id="${id}"`) || androidHtml.includes(`id='${id}'`);
  if (!hasId) {
    androidMissing.push(id);
    console.log('❌ MISSING IN ANDROID HTML:', id);
  }
}
if (androidMissing.length === 0) {
  console.log('All IDs found in android HTML as well!');
}
