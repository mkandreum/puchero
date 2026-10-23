// Empaqueta el servidor Express en dist/server.js (las dependencias quedan como externas).
import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/server/index.ts'],
  outfile: 'dist/server.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  packages: 'external',
  sourcemap: true,
  logLevel: 'info'
});
