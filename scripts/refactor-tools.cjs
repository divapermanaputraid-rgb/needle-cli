const fs = require('fs');
const path = require('path');

const files = [
  'src/tools/dir.create.ts',
  'src/tools/dir.exists.ts',
  'src/tools/dir.list.ts',
  'src/tools/file-read.ts',
  'src/tools/file-write.ts',
  'src/tools/shell.ts',
];

for (const file of files) {
  const filePath = path.join(process.cwd(), file);
  let content = fs.readFileSync(filePath, 'utf8');

  // get tool name
  const nameMatch = content.match(/name:\s*"([^"]+)"/);
  if (!nameMatch) continue;
  const toolName = nameMatch[1];

  // replace output: with error: or result: depending on ok value
  content = content.replace(/{\s*ok:\s*false\s*,\s*output:\s*(.*?)\s*(?:,\s*metadata:\s*({[^}]*}))?\s*}/g, (match, output, metadata) => {
    // some outputs are `Error: ${...}` or `"Error: ..."`
    let errorStr = output.trim();
    if (errorStr.startsWith('"Error: ')) {
        errorStr = '"' + errorStr.slice(8);
    } else if (errorStr.startsWith('`Error: ')) {
        errorStr = '`' + errorStr.slice(8);
    }
    
    let res = `{ ok: false, tool: "${toolName}", error: ${errorStr}`;
    if (metadata) {
      res += `, metadata: ${metadata}`;
    }
    res += ' }';
    return res;
  });

  content = content.replace(/{\s*ok:\s*true\s*,\s*output:\s*(.*?)\s*(?:,\s*metadata:\s*({[^}]*}))?\s*}/g, (match, output, metadata) => {
    let res = `{ ok: true, tool: "${toolName}", result: ${output.trim()}`;
    if (metadata) {
      res += `, metadata: ${metadata}`;
    }
    res += ' }';
    return res;
  });

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Refactored ${file}`);
}