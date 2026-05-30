import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const imagePath = 'C:\\Users\\dheer\\OneDrive\\Pictures\\Screenshots\\Screenshot 2026-04-21 005505.png';
const imageData = readFileSync(imagePath);
const base64    = imageData.toString('base64');

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
});

// Write payload to temp file to avoid CLI length limits
import { writeFileSync } from 'fs';
writeFileSync('d:\\work\\internshala\\Dobby Ads\\backend\\mcp_payload.json', payload);
console.log('Payload written, running MCP server...');
