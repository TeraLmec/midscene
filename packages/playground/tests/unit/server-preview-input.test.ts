import { describe, expect, test, vi } from 'vitest';
import { PlaygroundServer } from '../../src/server';

function createMockResponse() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
}

function getRouteHandler(server: PlaygroundServer, route: string) {
  const calls = (server.app.post as any).mock.calls as Array<[string, any]>;
  return calls.find(([registeredRoute]) => registeredRoute === route)?.[1];
}

describe('PlaygroundServer preview input APIs', () => {
  test('forwards click input to Puppeteer mouse', async () => {
    const click = vi.fn();
    const server = new PlaygroundServer({
      interface: {
        interfaceType: 'puppeteer',
        mouse: { click },
      },
    } as any);
    await server.launch(6111);

    const handler = getRouteHandler(server, '/input/click');
    const res = createMockResponse();
    await handler({ body: { x: 10, y: 20, clickCount: 2 } }, res);

    expect(res.statusCode).toBe(200);
    expect(click).toHaveBeenCalledWith(10, 20, {
      button: 'left',
      count: 2,
    });
    await server.close();
  });

  test('rejects preview input for non-Puppeteer sessions', async () => {
    const server = new PlaygroundServer({
      interface: {
        interfaceType: 'android',
      },
    } as any);
    await server.launch(6112);

    const handler = getRouteHandler(server, '/input/type');
    const res = createMockResponse();
    await handler({ body: { text: 'hello' } }, res);

    expect(res.statusCode).toBe(501);
    expect(res.body).toMatchObject({
      error: 'Preview input is only supported for Puppeteer sessions',
    });
    await server.close();
  });

  test('validates unsupported keys', async () => {
    const server = new PlaygroundServer({
      interface: {
        interfaceType: 'puppeteer',
        keyboard: { press: vi.fn() },
      },
    } as any);
    await server.launch(6113);

    const handler = getRouteHandler(server, '/input/key');
    const res = createMockResponse();
    await handler({ body: { key: 'A' } }, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ error: 'Unsupported key: A' });
    await server.close();
  });
});
