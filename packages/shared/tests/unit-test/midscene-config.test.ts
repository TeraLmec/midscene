import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadMidsceneRootAiModelConfig } from '../../src/node/midscene-config';

const tempDirs: string[] = [];

function createTempDir() {
  const dir = mkdtempSync(join(tmpdir(), 'midscene-config-test-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0, tempDirs.length)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('loadMidsceneRootAiModelConfig', () => {
  it('loads retry settings from nearest root yaml', () => {
    const rootDir = createTempDir();
    const nestedDir = join(rootDir, 'apps', 'playground');
    mkdirSync(nestedDir, { recursive: true });

    const configFile = join(rootDir, 'midscene.config.yaml');
    writeFileSync(
      configFile,
      [
        'aiModel:',
        '  retryCount: 5',
        '  retryInterval: 5000',
        'otherSection:',
        '  enabled: true',
      ].join('\n'),
      'utf-8',
    );

    const result = loadMidsceneRootAiModelConfig(nestedDir);
    expect(result).toEqual({
      filePath: configFile,
      aiModel: {
        retryCount: 5,
        retryInterval: 5000,
      },
    });
  });

  it('returns null when config file is missing', () => {
    const rootDir = createTempDir();
    const nestedDir = join(rootDir, 'packages', 'cli');
    mkdirSync(nestedDir, { recursive: true });

    const result = loadMidsceneRootAiModelConfig(nestedDir);
    expect(result).toBeNull();
  });

  it('returns null when aiModel has no retry fields', () => {
    const rootDir = createTempDir();
    const configFile = join(rootDir, 'midscene.config.yml');
    writeFileSync(
      configFile,
      ['aiModel:', '  timeout: 10000', 'featureFlags:', '  enabled: true'].join(
        '\n',
      ),
      'utf-8',
    );

    const result = loadMidsceneRootAiModelConfig(rootDir);
    expect(result).toBeNull();
  });

  it('throws on invalid retryCount', () => {
    const rootDir = createTempDir();
    writeFileSync(
      join(rootDir, 'midscene.config.yaml'),
      ['aiModel:', '  retryCount: abc'].join('\n'),
      'utf-8',
    );

    expect(() => loadMidsceneRootAiModelConfig(rootDir)).toThrowError(
      /Invalid retryCount .* expected a number, got abc/,
    );
  });

  it('throws on negative retryInterval', () => {
    const rootDir = createTempDir();
    writeFileSync(
      join(rootDir, 'midscene.config.yaml'),
      ['aiModel:', '  retryInterval: -1'].join('\n'),
      'utf-8',
    );

    expect(() => loadMidsceneRootAiModelConfig(rootDir)).toThrowError(
      /Invalid retryInterval .* expected non-negative number, got -1/,
    );
  });
});
