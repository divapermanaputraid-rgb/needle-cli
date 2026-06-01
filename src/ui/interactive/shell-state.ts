import { NeedleConfig } from '../../config/schema.js';

export interface ShellState {
  cwd: string;
  config: NeedleConfig | null;
  provider: string | null;
  profile: string | null;
  modelId: string | null;
}

export function createInitialShellState(cwd: string, config: NeedleConfig | null): ShellState {
  return {
    cwd,
    config,
    provider: config ? (config.defaultProvider || '9router') : null,
    profile: config ? 'fast' : null,
    modelId: null
  };
}
