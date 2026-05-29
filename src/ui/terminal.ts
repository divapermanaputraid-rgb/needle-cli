// Needle Terminal UI — Sprint 0 placeholder
// TODO: Sprint 1 — ink or blessed-based TUI
export function print(msg: string): void {
  process.stdout.write(msg + "\n");
}

export function printHeader(title: string): void {
  console.log(`\n🍄 Needle — ${title}`);
  console.log("─".repeat(40));
}
