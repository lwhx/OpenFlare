import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const outDir = resolve(root, 'out');
const buildDir = resolve(root, 'build');

if (!existsSync(outDir)) {
  throw new Error('Missing Next.js export output: out/');
}

rmSync(buildDir, { recursive: true, force: true });
mkdirSync(buildDir, { recursive: true });
cpSync(outDir, buildDir, { recursive: true });
