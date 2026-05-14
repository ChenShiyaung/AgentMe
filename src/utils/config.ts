import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

export interface AgentmeConfig {
  agentmeDir: string;
  platforms: { name: string; scope: string; installedAt: string }[];
  initializedAt: string;
}

const CONFIG_PATH = path.join(os.homedir(), '.agentme.json');

export async function readConfig(): Promise<AgentmeConfig | null> {
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf8');
    return JSON.parse(raw) as AgentmeConfig;
  } catch {
    return null;
  }
}

export async function writeConfig(config: AgentmeConfig): Promise<void> {
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

export function getConfigPath(): string {
  return CONFIG_PATH;
}
