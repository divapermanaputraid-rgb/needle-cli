import { ShellState } from './shell-state.js';
import * as os from 'node:os';

export function renderBrandHeader(state: ShellState): void {
  const reset = '\x1b[0m';
  const bold = '\x1b[1m';
  const cyan = '\x1b[36m';

  const termWidth = process.stdout.columns || 80;
  const boxWidth = Math.min(60, Math.max(40, termWidth));
  const contentWidth = boxWidth - 4;

  let displayCwd = state.cwd;
  const homeDir = os.homedir();
  if (displayCwd.startsWith(homeDir)) {
    displayCwd = '~' + displayCwd.slice(homeDir.length);
  }
  
  if (displayCwd.length > contentWidth - 5) {
     displayCwd = '...' + displayCwd.slice(-(contentWidth - 8));
  }

  const title = " Needle ";
  const topBarLength = Math.max(0, boxWidth - 2 - title.length - 1);
  const topBar = '─'.repeat(topBarLength);
  console.log(`${cyan}╭─${bold}${title}${reset}${cyan}${topBar}╮${reset}`);

  const line1 = `>_ AI Coding CLI`;
  console.log(`${cyan}│${reset} ${line1.padEnd(contentWidth)} ${cyan}│${reset}`);

  const line2 = `cwd: ${displayCwd}`;
  console.log(`${cyan}│${reset} ${line2.padEnd(contentWidth)} ${cyan}│${reset}`);

  if (state.config && state.provider) {
    const providerStr = `provider: ${state.provider}`;
    const modelStr = `model: ${state.profile || 'default'}`;
    const modeStr = `mode: Normal`;
    
    const line3 = `${providerStr}   ${modelStr}   ${modeStr}`;
    
    if (line3.length > contentWidth) {
      console.log(`${cyan}│${reset} ${providerStr.padEnd(contentWidth)} ${cyan}│${reset}`);
      console.log(`${cyan}│${reset} ${modelStr.padEnd(contentWidth)} ${cyan}│${reset}`);
      console.log(`${cyan}│${reset} ${modeStr.padEnd(contentWidth)} ${cyan}│${reset}`);
    } else {
      console.log(`${cyan}│${reset} ${line3.padEnd(contentWidth)} ${cyan}│${reset}`);
    }
  } else {
    const line3 = `setup: not configured`;
    console.log(`${cyan}│${reset} ${line3.padEnd(contentWidth)} ${cyan}│${reset}`);
  }

  const bottomBar = '─'.repeat(Math.max(0, boxWidth - 2));
  console.log(`${cyan}╰${bottomBar}╯${reset}`);
  console.log('');
}
