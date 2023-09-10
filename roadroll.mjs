import { Packer } from 'roadroller';
import { readFileSync, renameSync, rm, writeFileSync } from 'fs';

console.error('Roadrolling...');
const startTime = Date.now();

const js = readFileSync('dist/main.js', 'utf-8');
const html = readFileSync('dist/index.html', 'utf-8');
const inputs = [
    {
        data: js,
        type: 'js',
        action: 'eval',
    },
];

const packer = new Packer(inputs);
await packer.optimize();

const { firstLine, secondLine } = packer.makeDecoder();

const finalHtml = html.replace('<script defer="defer" src="main.js"></script>', `<script>${firstLine + secondLine}</script>`);
if (finalHtml === html) {
    throw new Error('Unable to find script tag');
}

renameSync('dist/index.html', 'dist/index.html.bak');
writeFileSync('dist/index.html', finalHtml);

console.error(`Roadrolled in ${Date.now() - startTime}ms`);
