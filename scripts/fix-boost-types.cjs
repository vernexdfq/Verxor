#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'src', 'boost-page.tsx');
if (!fs.existsSync(file)) process.exit(0);
let t = fs.readFileSync(file, 'utf8');
const before = t;
t = t.replace(
  /const newlyCompleted = \[\];/g,
  'const newlyCompleted: BoostOrder[] = [];',
);
if (t !== before) {
  fs.writeFileSync(file, t);
  console.log('[fix-boost-types] typed newlyCompleted');
} else {
  console.log('[fix-boost-types] no change');
}
