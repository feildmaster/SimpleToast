import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rollup } from 'rollup';

const dir = path.dirname(fileURLToPath(import.meta.url));
const resolve = (...parts) => path.join(dir, ...parts);

const cssAsString = {
  name: 'css-as-string',
  load(id) {
    if (!id.endsWith('.css')) return null;
    return `export default ${JSON.stringify(fs.readFileSync(id, 'utf8'))};`;
  },
};

async function bundle(input) {
  const build = await rollup({
    input: resolve('src', input),
    plugins: [cssAsString],
  });
  const { output } = await build.generate({
    format: 'es',
    banner: '((root) => {',
    footer: '})(this);',
    generatedCode: {
      constBindings: true,
    },
  });
  await build.close();
  return output[0].code;
}

fs.mkdirSync(resolve('dist'), { recursive: true });

fs.writeFileSync(resolve('dist', 'simpletoast.js'), await bundle('index.js'));
fs.writeFileSync(resolve('dist', 'simpletoast.core.js'), await bundle('core.js'));
fs.writeFileSync(resolve('dist', 'simpletoast.timers.js'), await bundle('timers.js'));
fs.copyFileSync(resolve('src', 'index.css'), resolve('dist', 'simpletoast.css'));
const declarations = {
  'index.d.ts': 'simpletoast.d.ts',
  'core.d.ts': 'simpletoast.core.d.ts',
  'timers.d.ts': 'simpletoast.timers.d.ts',
};
Object.entries(declarations).forEach(([source, target]) => {
  const content = fs.readFileSync(resolve('src', source), 'utf8')
    .replaceAll("'./core'", "'./simpletoast.core'")
    .replaceAll("'./timers'", "'./simpletoast.timers'");
  fs.writeFileSync(resolve('dist', target), content);
});
