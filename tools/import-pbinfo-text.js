'use strict';

// Paste one or more copied pbInfo pages into stdin:
// node tools/import-pbinfo-text.js < copied-pages.txt
const fs = require('fs');
const path = require('path');

const input = fs.readFileSync(0, 'utf8').replace(/\r\n/g, '\n');
const pages = input.split(/(?=^#\d+\s+[^\n]+$)/m).filter((part) => /^#\d+\s+[^\n]+$/m.test(part));
if (!pages.length) throw new Error('No problem heading such as #4798 Cuvinte19 found.');

const headings = /^(Cerin[țţt][aă]?|Date de intrare|Date de ie[șşs]ire|Restric[țţt]ii [șşs]i preciz[ăa]ri|Exemple?:)$/i;
let imported = 0;
for (const page of pages) {
  const match = page.match(/^#(\d+)\s+([^\n]+)$/m);
  const id = Number(match[1]);
  const lines = page.slice(match.index + match[0].length).split('\n');
  const start = lines.findIndex((line) => headings.test(line.trim()));
  if (start < 0) throw new Error(`No statement found for #${id}`);
  const end = lines.findIndex((line, index) => index > start && /^(Încărcare soluție|Lipește codul aici|Contact)$/.test(line.trim()));
  const statement = lines.slice(start, end < 0 ? undefined : end).join('\n').trim();
  if (!/Cerin[țţt]/i.test(statement) || !/Date de intrare/i.test(statement)) {
    throw new Error(`Incomplete statement for #${id}`);
  }
  const first = Math.floor((id - 1) / 1000) * 1000 + 1;
  const directory = path.join(__dirname, '..', 'data', 'problems', `${first}-${first + 999}`);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, `${id}.txt`), `${statement}\n`);
  console.log(`#${id} ${match[2]} → data/problems/${first}-${first + 999}/${id}.txt`);
  imported += 1;
}
console.log(`Imported ${imported} problem statement(s).`);
