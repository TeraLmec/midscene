import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  const content = readFileSync(filePath, 'utf8');
  const result = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

function parsePort(value, fallback, envName) {
  if (!value) {
    return fallback;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`${envName} must be a valid TCP port, received: ${value}`);
  }

  return String(port);
}

const rootEnv = parseEnvFile(envPath);
const env = {
  ...rootEnv,
  ...process.env,
};

const serverPort = parsePort(
  env.WEB_PLAYGROUND_SERVER_PORT || env.PLAYGROUND_SERVER_PORT,
  '5870',
  'WEB_PLAYGROUND_SERVER_PORT',
);
const clientPort = parsePort(
  env.WEB_PLAYGROUND_CLIENT_PORT,
  '3000',
  'WEB_PLAYGROUND_CLIENT_PORT',
);
const serverUrl = env.__SERVER_URL__ || `http://127.0.0.1:${serverPort}`;

const childEnv = {
  ...env,
  WEB_PLAYGROUND_SERVER_PORT: serverPort,
  WEB_PLAYGROUND_CLIENT_PORT: clientPort,
  __SERVER_URL__: serverUrl,
};

const children = [];
let shuttingDown = false;

function launch(name, args) {
  const child = spawn('pnpm', args, {
    cwd: rootDir,
    env: childEnv,
    stdio: 'inherit',
  });

  children.push(child);

  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    for (const processToStop of children) {
      if (processToStop !== child && !processToStop.killed) {
        processToStop.kill('SIGTERM');
      }
    }

    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exitCode = code ?? 1;
    console.error(`${name} exited with code ${process.exitCode}`);
  });

  return child;
}

function stopAll() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }
}

process.on('SIGINT', () => {
  stopAll();
});

process.on('SIGTERM', () => {
  stopAll();
});

console.log(`Loading environment from ${envPath}`);
console.log(`Starting web playground server at ${serverUrl}`);
console.log(`Starting web playground client at http://127.0.0.1:${clientPort}`);

launch('web playground server', [
  '--dir',
  'apps/playground',
  'exec',
  'tsx',
  'demo/server.ts',
]);

launch('web playground client', [
  '--dir',
  'apps/playground',
  'exec',
  'rsbuild',
  'dev',
  '--open',
  '--port',
  clientPort,
]);
