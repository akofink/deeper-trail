import { describe, expect, it, vi } from 'vitest';

import {
  bootstrapBrowserShell,
} from '../src/game/runtime/browserShellBootstrap';
import type {
  BrowserDocumentHost,
  BrowserShellHost
} from '../src/game/runtime/browserShellRuntime';
import type { createBrowserShellBootstrapSession } from '../src/game/runtime/browserShellBootstrapSession';

describe('browserShellBootstrap', () => {
  it('creates the browser-shell session and draws the initial scene', async () => {
    const shellWindow = {
      addEventListener: vi.fn(),
      location: { search: '?seed=bootstrap-route' },
      requestAnimationFrame: vi.fn()
    } as unknown as BrowserShellHost;
    const documentHost = {
      exitFullscreen: vi.fn(async () => {}),
      fullscreenElement: null,
      querySelector: vi.fn()
    } as unknown as BrowserDocumentHost;
    const drawInitialScene = vi.fn();
    const createSessionMock = vi.fn(async () => ({
      app: {
        canvas: { requestFullscreen: vi.fn(async () => {}) },
        init: vi.fn(async () => {}),
        renderer: { render: vi.fn() },
        screen: { height: 720, width: 1280 },
        stage: { addChild: vi.fn() },
        ticker: { stop: vi.fn() }
      },
      rendererBindings: {
        appDependencies: {
          Application: class {} as never,
          createSceneTextNodes: vi.fn(),
          Graphics: class {} as never,
          Text: class {} as never
        },
        renderMapScene: vi.fn(),
        renderRunScene: vi.fn()
      },
      runtime: {
        drawInitialScene,
        getState: vi.fn()
      }
    }));
    const createSession = createSessionMock as unknown as typeof createBrowserShellBootstrapSession;

    await bootstrapBrowserShell(shellWindow, documentHost, {
      createBrowserShellBootstrapSession: createSession
    });

    expect(createSessionMock).toHaveBeenCalledOnce();
    expect(drawInitialScene).toHaveBeenCalledOnce();
  });
});
