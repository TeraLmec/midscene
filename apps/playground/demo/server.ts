import { fileURLToPath } from 'node:url';
import { playgroundForAgent } from '@midscene/playground';
import { PuppeteerAgent } from '@midscene/web/puppeteer';
import dotenv from 'dotenv';
import puppeteer from 'puppeteer';

dotenv.config({
  path: fileURLToPath(new URL('../../../.env', import.meta.url)),
});

function getServerPort() {
  const rawPort =
    process.env.WEB_PLAYGROUND_SERVER_PORT ||
    process.env.PLAYGROUND_SERVER_PORT;
  if (!rawPort) {
    return 5870;
  }

  const port = Number(rawPort);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid web playground server port: ${rawPort}`);
  }

  return port;
}

async function main() {
  console.log('🚀 Starting Playground Demo Server...');
  const port = getServerPort();

  // Launch Puppeteer browser directly
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
    executablePath: undefined, // Let puppeteer find Chrome automatically
  });

  const puppeteerPage = await browser.newPage();

  // Navigate to the test page
  await puppeteerPage.goto(
    'https://lf3-static.bytednsdoc.com/obj/eden-cn/nupipfups/Midscene/contacts3.html',
  );

  await puppeteerPage.setViewport({
    width: 1280,
    height: 768,
  });

  // Create the agent with the Puppeteer page
  const agent = new PuppeteerAgent(puppeteerPage, {
    cacheId: 'playground-demo-test',
  });

  // Launch playground server with CORS enabled for playground app
  const server = await playgroundForAgent(agent).launch({
    port,
    openBrowser: false, // Don't open browser automatically
    verbose: true,
    enableCors: true,
  });

  console.log(`✅ Playground Demo Server started on port ${server.port}`);
  console.log(`🔑 Server ID: ${server.server.id}`);
  console.log(
    '🌐 You can now start the playground app and it will connect to this server',
  );
  console.log('');
  console.log('To start the playground app:');
  console.log('  cd apps/playground && npm run dev');
  console.log('');
  console.log('To stop this demo server, press Ctrl+C');

  // Keep the process running
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down demo server...');
    await server.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('❌ Failed to start demo server:', err);
  process.exit(1);
});
