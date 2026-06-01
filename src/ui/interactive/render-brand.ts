export function renderBrandHeader(): void {
  // ANSI colors
  const reset = '\x1b[0m';
  const dim = '\x1b[2m';
  const bold = '\x1b[1m';
  const blue = '\x1b[38;5;39m'; // roughly OpenCode/Needle color

  // Hardcoded pixel/blocky vibe wordmark
  const wordmark = `
${blue}█▄ ▄█ █▀▀ █▀▀ █▀▄ █   █▀▀
█ ▀ █ █▀▀ █▀▀ █ █ █   █▀▀
▀   ▀ ▀▀▀ ▀▀▀ ▀▀  ▀▀▀ ▀▀▀${reset}
`;

  const tagline = `${dim}Needle Interactive • 🪡 + 🧵 + >_${reset}`;
  
  console.log(wordmark);
  console.log(tagline);
  console.log('');
}