const fs = require('fs');
const path = require('path');

const md = fs.readFileSync(path.join(__dirname, '..', 'docs', 'diagrama-clases.md'), 'utf8');
const blocks = [...md.matchAll(/```mermaid\n([\s\S]*?)```/g)].map((m) => m[1].trim());

if (blocks.length !== 3) {
  console.error('Se esperaban 3 bloques mermaid, se encontraron ' + blocks.length);
  process.exit(1);
}

const outDir = path.join(__dirname, 'out');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

const names = ['1-frontend-dominio', '2-frontend-escenas', '3-backend'];
names.forEach((name, i) => {
  const file = path.join(outDir, name + '.mmd');
  fs.writeFileSync(file, '%% diagrama ' + name + '\nclassDiagram\n' + blocks[i].slice(blocks[i].indexOf('\n') + 1));
  console.log('Escribiendo ' + file);
});