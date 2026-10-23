// Empaqueta el frontend (React + CSS) con esbuild y copia /public a dist/public.
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const watch = process.argv.includes('--watch');
const out = path.resolve('dist/public');
const build = Date.now().toString(36);

fs.rmSync(out, { recursive: true, force: true });
fs.cpSync('public', out, { recursive: true });
const html = path.join(out, 'index.html');
fs.writeFileSync(html, fs.readFileSync(html, 'utf8').replaceAll('__BUILD__', build));

const ctx = await esbuild.context({
  entryPoints: { app: 'src/client/main.tsx' },
  outdir: path.join(out, 'assets'),
  bundle: true,
  format: 'esm',
  target: ['es2020', 'safari15'],
  jsx: 'automatic',
  minify: !watch,
  sourcemap: watch,
  define: { 'process.env.NODE_ENV': JSON.stringify(watch ? 'development' : 'production') },
  nodePaths: process.env.EXTRA_NODE_PATH ? [process.env.EXTRA_NODE_PATH] : [],
  logLevel: 'info'
});

if (watch) await ctx.watch();
else {
  await ctx.rebuild();
  await ctx.dispose();
}
