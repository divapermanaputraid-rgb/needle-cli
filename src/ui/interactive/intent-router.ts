export type Intent = 'chat' | 'code_action' | 'plan';

export function routeIntent(input: string): Intent {
  const lowerInput = input.toLowerCase();

  // Plan intent
  if (/\b(plan|rencana|planning|breakdown|architecture plan|buat step|bikin plan)\b/.test(lowerInput)) {
    return 'plan';
  }

  // Code Action (workspace-changing) intent
  if (/\b(buat file|create file|buat folder|create folder|edit|fix|implement|tambah|update|refactor|install|run command|delete|remove)\b/.test(lowerInput)) {
    return 'code_action';
  }

  // Default to chat (includes review-like text, questions, brainstorming, explanations)
  return 'chat';
}
