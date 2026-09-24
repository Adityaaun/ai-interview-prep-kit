const fs = require('fs');
const path = require('path');

function walk(d) {
  fs.readdirSync(d).forEach(f => {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.tsx')) {
      let c = fs.readFileSync(p, 'utf8');
      if (c.startsWith('" use client;')) {
        c = c.replace('" use client;\n', '"use client";\n');
      } else if (c.startsWith('use client;\n')) {
         c = c.replace('use client;\n', '"use client";\n');
      } else if (!c.includes('"use client"')) {
         c = '"use client";\n' + c;
      }
      fs.writeFileSync(p, c);
    }
  });
}
walk('src/app');
