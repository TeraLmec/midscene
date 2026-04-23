import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { ifInBrowser, ifInWorker } from '../utils';

const MIDSCENE_CONFIG_CANDIDATES = [
  'midscene.config.yaml',
  'midscene.config.yml',
] as const;

export interface MidsceneRootAiModelConfig {
  retryCount?: number;
  retryInterval?: number;
}

export interface MidsceneRootConfigResult {
  filePath: string;
  aiModel: MidsceneRootAiModelConfig;
}

function stripInlineComment(value: string): string {
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }
    if (ch === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }
    if (ch === '#' && !inSingleQuote && !inDoubleQuote) {
      return value.slice(0, i).trim();
    }
  }

  return value.trim();
}

function parseNonNegativeNumber(
  rawValue: string,
  filePath: string,
  keyName: 'retryCount' | 'retryInterval',
): number {
  const trimmed = stripInlineComment(rawValue)
    .replace(/^['"]/, '')
    .replace(/['"]$/, '')
    .trim();

  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    throw new Error(
      `Invalid ${keyName} in ${filePath}: expected a number, got ${rawValue}`,
    );
  }
  if (value < 0) {
    throw new Error(
      `Invalid ${keyName} in ${filePath}: expected non-negative number, got ${value}`,
    );
  }
  return value;
}

function parseAiModelSection(content: string, filePath: string) {
  const lines = content.split(/\r?\n/);
  let inAiModelSection = false;
  const result: MidsceneRootAiModelConfig = {};

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    if (!inAiModelSection) {
      if (/^aiModel\s*:\s*$/.test(trimmed)) {
        inAiModelSection = true;
      }
      continue;
    }

    if (/^[^\s].*:\s*/.test(line)) {
      break;
    }

    const retryCountMatch = line.match(/^\s+retryCount\s*:\s*(.+)\s*$/);
    if (retryCountMatch) {
      result.retryCount = parseNonNegativeNumber(
        retryCountMatch[1],
        filePath,
        'retryCount',
      );
      continue;
    }

    const retryIntervalMatch = line.match(/^\s+retryInterval\s*:\s*(.+)\s*$/);
    if (retryIntervalMatch) {
      result.retryInterval = parseNonNegativeNumber(
        retryIntervalMatch[1],
        filePath,
        'retryInterval',
      );
    }
  }

  return result;
}

function findMidsceneRootConfigFile(startDir: string): string | undefined {
  let currentDir = startDir;

  while (true) {
    for (const fileName of MIDSCENE_CONFIG_CANDIDATES) {
      const filePath = join(currentDir, fileName);
      if (existsSync(filePath)) {
        return filePath;
      }
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      return undefined;
    }
    currentDir = parentDir;
  }
}

export function loadMidsceneRootAiModelConfig(
  startDir = process.cwd(),
): MidsceneRootConfigResult | null {
  if (ifInBrowser || ifInWorker) {
    return null;
  }

  const filePath = findMidsceneRootConfigFile(startDir);
  if (!filePath) {
    return null;
  }

  const content = readFileSync(filePath, 'utf-8');
  const aiModel = parseAiModelSection(content, filePath);

  if (aiModel.retryCount === undefined && aiModel.retryInterval === undefined) {
    return null;
  }

  return {
    filePath,
    aiModel,
  };
}
