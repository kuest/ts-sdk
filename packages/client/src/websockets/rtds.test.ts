import { ws } from 'msw';
import { setupServer } from 'msw/node';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { production } from '../environments';
import { RtdsWebSocketManager } from './rtds';
import { collectFrames, waitForNextEvent } from './testing';

const rtds = ws.link(production.rtds.ws);
const server = setupServer();
const manager = new RtdsWebSocketManager({ url: production.rtds.ws });

describe('RtdsWebSocketManager', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'bypass' });
  });

  afterEach(async () => {
    await manager.close();
    server.resetHandlers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  afterAll(() => {
    server.close();
  });

  it('unsubscribes only the unshared server entry for overlapping comments subscriptions', async () => {
    const frames = collectFrames(server, rtds);

    const mixedHandle = await manager.subscribe({
      topic: 'comments',
      types: ['comment_created', 'reaction_created'],
    });
    await manager.subscribe({ topic: 'comments', types: ['reaction_created'] });

    await vi.waitFor(() => {
      expect(frames).toEqual([
        {
          action: 'subscribe',
          subscriptions: [
            { topic: 'comments', type: 'comment_created' },
            { topic: 'comments', type: 'reaction_created' },
          ],
        },
      ]);
    });

    frames.length = 0;
    await mixedHandle.close();
    expect(frames).toEqual([
      {
        action: 'unsubscribe',
        subscriptions: [{ topic: 'comments', type: 'comment_created' }],
      },
    ]);
  });
  it('sends PING heartbeats while subscribed', { timeout: 5_000 }, async () => {
    const frames: string[] = [];

    server.use(
      rtds.addEventListener('connection', ({ client }) => {
        client.addEventListener('message', (event) => {
          frames.push(String(event.data));
        });
      }),
    );

    vi.useFakeTimers();

    await manager.subscribe({
      topic: 'comments',
    });

    await vi.advanceTimersByTimeAsync(5_000);

    expect(frames).toContain('PING');
  });
  it('ends active iterators when the manager closes', async () => {
    const handle = await manager.subscribe({
      topic: 'comments',
    });
    const next = waitForNextEvent(handle);

    await manager.close();

    await expect(next).resolves.toMatchObject({ done: true });
  });
  it('unsubscribes from a server entry only after the last subscription closes', async () => {
    const frames = collectFrames(server, rtds);

    const btcHandle = await manager.subscribe({
      topic: 'comments',
    });
    const ethHandle = await manager.subscribe({
      topic: 'comments',
    });

    await vi.waitFor(() => {
      expect(frames).toEqual([
        {
          action: 'subscribe',
          subscriptions: [{ topic: 'comments', type: 'comment_created' }],
        },
      ]);
    });

    frames.length = 0;
    await btcHandle.close();
    expect(frames).toEqual([]);

    frames.length = 0;
    await ethHandle.close();
    expect(frames).toEqual([
      {
        action: 'unsubscribe',
        subscriptions: [{ topic: 'comments', type: 'comment_created' }],
      },
    ]);
  });
  it('reconnects and resubscribes active server entries after an unexpected close', {
    timeout: 5_000,
  }, async () => {
    const connectionFrames: unknown[][] = [];
    let firstClient: { close: () => void } | undefined;
    let secondClient: { send: (data: string) => void } | undefined;

    server.use(
      rtds.addEventListener('connection', ({ client }) => {
        const frames: unknown[] = [];
        connectionFrames.push(frames);
        if (connectionFrames.length === 1) firstClient = client;
        if (connectionFrames.length === 2) secondClient = client;
        client.addEventListener('message', (event) => {
          frames.push(JSON.parse(String(event.data)));
        });
      }),
    );

    vi.useFakeTimers();

    const handle = await manager.subscribe({
      topic: 'comments',
    });
    const next = waitForNextEvent(handle);

    await vi.waitFor(() => {
      expect(connectionFrames[0] ?? []).toEqual([
        {
          action: 'subscribe',
          subscriptions: [{ topic: 'comments', type: 'comment_created' }],
        },
      ]);
    });

    firstClient?.close();
    await vi.advanceTimersToNextTimer();

    await vi.waitFor(() => {
      expect(connectionFrames[1] ?? []).toEqual([
        {
          action: 'subscribe',
          subscriptions: [{ topic: 'comments', type: 'comment_created' }],
        },
      ]);
    });

    secondClient?.send(
      JSON.stringify({
        payload: { id: '1', body: 'hello' },
        timestamp: 1,
        topic: 'comments',
        type: 'comment_created',
      }),
    );

    await expect(next).resolves.toMatchObject({
      done: false,
      value: {
        payload: { id: '1', body: 'hello' },
        topic: 'comments',
        type: 'comment_created',
      },
    });
  });
});
