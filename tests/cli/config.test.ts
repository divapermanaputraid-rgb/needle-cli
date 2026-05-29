import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Config Command', () => {
  test('config set providers.9router.baseUrl works', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'needle-test-'));
    const cliPath = path.resolve(__dirname, '../../dist/index.js');
    
    // Create initial empty .needle config to avoid prompts
    const needleDir = path.join(tempDir, '.needle');
    fs.mkdirSync(needleDir);
    fs.writeFileSync(path.join(needleDir, 'config.json'), JSON.stringify({}));
    
    try {
      // Execute the command in the temp directory
      const output = execSync(`node ${cliPath} config set providers.9router.baseUrl http://localhost:3000/v1`, {
        cwd: tempDir,
        encoding: 'utf-8',
        stdio: 'pipe'
      });
      
      assert.ok(output.includes('Successfully set providers.9router.baseUrl to http://localhost:3000/v1'));
      
      // Verify it was actually written
      const configPath = path.join(needleDir, 'config.json');
      const savedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      
      assert.ok(savedConfig.providers);
      assert.ok(savedConfig.providers['9router']);
      assert.strictEqual(savedConfig.providers['9router'].baseUrl, 'http://localhost:3000/v1');
    } finally {
      // Cleanup
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});