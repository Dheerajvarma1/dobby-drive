import { readFileSync, writeFileSync } from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read and encode image
const imagePath = 'C:\\Users\\dheer\\OneDrive\\Pictures\\Screenshots\\Screenshot 2026-04-21 005505.png';
const base64    = readFileSync(imagePath).toString('base64');

const payload = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'upload_image',
    arguments: {
      imageName:   'Screenshot 2026-04-21 005505.png',
      base64Data:  base64,
      contentType: 'image/png',
      parentPath:  'Campaigns',
    },
  },
}) + '\n';

console.log('Uploading image via MCP...');

const proc = spawn('node', ['mcp-server.mjs'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: ['pipe', 'pipe', 'pipe'],
});

let output = '';
proc.stdout.on('data', d => { output += d.toString(); });
proc.stderr.on('data', () => {}); // suppress logs

proc.on('close', () => {
  const lines = output.split('\n').filter(l => l.trim().startsWith('{'));
  for (const line of lines) {
    try {
      const json = JSON.parse(line);
      if (json.result) {
        console.log('Result:', json.result.content[0].text);
      }
    } catch {}
  }
  process.exit(0);
});

proc.stdin.write(payload);
proc.stdin.end();

setTimeout(() => { proc.kill(); process.exit(0); }, 15000);
