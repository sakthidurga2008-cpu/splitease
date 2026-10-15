// Starts the API server and the website together for development.
//
//   npm run dev
//
// API:     http://localhost:4000  (restarts when a server file changes)
// Website: http://localhost:5173  (updates in the browser as you edit)
//
// Press Ctrl+C to stop both.

const { spawn } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

const processes = [
  {
    name: 'api',
    cwd: path.join(root, 'server'),
    args: ['--watch', 'src/index.js'],
  },
  {
    name: 'web',
    cwd: path.join(root, 'client'),
    args: [path.join('node_modules', 'vite', 'bin', 'vite.js')],
  },
];

let stopping = false;

const children = processes.map(({ name, cwd, args }) => {
  const child = spawn(process.execPath, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });

  const print = (stream, target) => {
    stream.setEncoding('utf8');
    stream.on('data', (chunk) => {
      for (const line of chunk.split(/\r?\n/)) {
        if (line.trim()) target.write(`[${name}] ${line}\n`);
      }
    });
  };
  print(child.stdout, process.stdout);
  print(child.stderr, process.stderr);

  child.on('exit', (code) => {
    if (stopping) return;
    // If one of the two stops on its own, stop the other as well.
    console.error(`[${name}] stopped${code ? ` with code ${code}` : ''}.`);
    stopAll(code || 0);
  });
  return child;
});

function stopAll(code) {
  stopping = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));
