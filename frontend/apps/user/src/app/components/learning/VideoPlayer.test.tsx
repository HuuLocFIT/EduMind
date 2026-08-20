import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import axe from 'axe-core';
import { VideoPlayer } from './VideoPlayer';

const assertNoSeriousViolations = async (container: HTMLElement) => {
  const result = await axe.run(container, { resultTypes: ['violations'] });
  expect(result.violations.filter(({ impact }) => impact === 'critical' || impact === 'serious')).toEqual([]);
};

let fullscreenElement: Element | null = null;

const installMediaMocks = () => {
  let paused = true;
  let currentTimeValue = 0;
  let volumeValue = 1;
  let mutedValue = false;

  const playMock = vi.fn(function (this: HTMLMediaElement) {
    paused = false;
    this.dispatchEvent(new Event('play'));
    return Promise.resolve();
  });
  const pauseMock = vi.fn(function (this: HTMLMediaElement) {
    paused = true;
    this.dispatchEvent(new Event('pause'));
  });

  const textTracks = { length: 0, addEventListener: vi.fn(), removeEventListener: vi.fn() };

  Object.defineProperty(window.HTMLMediaElement.prototype, 'paused', {
    configurable: true,
    get: () => paused,
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
    configurable: true,
    value: playMock,
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    value: pauseMock,
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, 'currentTime', {
    configurable: true,
    get: () => currentTimeValue,
    set: (v: number) => { currentTimeValue = v; },
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, 'duration', {
    configurable: true,
    get: () => 100,
    set: () => undefined,
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, 'volume', {
    configurable: true,
    get: () => volumeValue,
    set: (v: number) => { volumeValue = v; },
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, 'muted', {
    configurable: true,
    get: () => mutedValue,
    set: (v: boolean) => { mutedValue = v; },
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, 'buffered', {
    configurable: true,
    get: () => ({ length: 0, start: () => 0, end: () => 0 }),
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, 'textTracks', {
    configurable: true,
    get: () => textTracks,
  });

  const requestFullscreenMock = vi.fn(function (this: Element) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- capturing invocation context of Element.prototype.requestFullscreen mock; arrow fn can't bind `this`
    fullscreenElement = this;
    return Promise.resolve();
  });
  const exitFullscreenMock = vi.fn(() => {
    fullscreenElement = null;
    return Promise.resolve();
  });

  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    get: () => fullscreenElement,
  });
  Element.prototype.requestFullscreen = requestFullscreenMock;
  document.exitFullscreen = exitFullscreenMock as typeof document.exitFullscreen;

  return {
    playMock,
    pauseMock,
    get currentTimeValue() { return currentTimeValue; },
    get volumeValue() { return volumeValue; },
    get mutedValue() { return mutedValue; },
  };
};

const installCaptionMocks = () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(new Blob(['WEBVTT\n\n1\n00:00:00.000 --> 00:00:02.000\nHello'])),
    }),
  );
  URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  URL.revokeObjectURL = vi.fn();
};

const VIDEO_SRC = 'https://example.com/video.mp4';

const keyDown = (element: HTMLElement, key: string) => {
  fireEvent.keyDown(element, { key });
};

beforeEach(() => {
  fullscreenElement = null;
  installCaptionMocks();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('VideoPlayer accessibility', () => {
  it('passes axe for the video state with captions loaded', async () => {
    const media = installMediaMocks();
    const { container } = render(
      <VideoPlayer src720p={VIDEO_SRC} captionSrc="https://example.com/captions.vtt" />,
    );
    await waitFor(() => expect(container.querySelector('track')).toBeInTheDocument());
    expect(media.playMock).not.toHaveBeenCalled();
    await assertNoSeriousViolations(container);
  });

  it('exposes named play, seek, volume, mute, captions and fullscreen controls', async () => {
    const { container } = render(
      <VideoPlayer src720p={VIDEO_SRC} captionSrc="https://example.com/captions.vtt" />,
    );
    fireEvent(container.querySelector('video')!, new Event('loadedmetadata'));
    await waitFor(() => expect(container.querySelector('track')).toBeInTheDocument());

    expect(screen.getByRole('group', { name: 'Video player' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play video' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Seek video' })).toHaveAttribute('aria-valuetext', '0:00 of 1:40');
    expect(screen.getByRole('slider', { name: 'Video volume' })).toHaveAttribute('aria-valuetext', '100% volume');
    expect(screen.getByRole('button', { name: 'Mute video' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Captions' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Enter fullscreen' })).toBeInTheDocument();
    expect(screen.getByRole('timer', { name: 'Elapsed time 0:00 of 1:40' })).toHaveClass(
      '[@media(max-width:360px)_and_(max-height:32rem)]:sr-only',
    );
  });

  it('updates play/pause through Space and K shortcuts', () => {
    const media = installMediaMocks();
    render(<VideoPlayer src720p={VIDEO_SRC} />);
    const group = screen.getByRole('group', { name: 'Video player' });

    keyDown(group, ' ');
    expect(media.playMock).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Pause video' })).toBeInTheDocument();

    keyDown(group, 'k');
    expect(media.pauseMock).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Play video' })).toBeInTheDocument();
  });

  it('seeks with the Left/Right keyboard shortcuts', () => {
    const media = installMediaMocks();
    render(<VideoPlayer src720p={VIDEO_SRC} />);
    const group = screen.getByRole('group', { name: 'Video player' });

    keyDown(group, 'ArrowRight');
    expect(media.currentTimeValue).toBe(5);
    keyDown(group, 'ArrowLeft');
    expect(media.currentTimeValue).toBe(0);
  });

  it('changes volume and mutes through the keyboard', () => {
    const media = installMediaMocks();
    render(<VideoPlayer src720p={VIDEO_SRC} />);
    const group = screen.getByRole('group', { name: 'Video player' });

    keyDown(group, 'ArrowDown');
    expect(media.volumeValue).toBeCloseTo(0.9, 5);
    keyDown(group, 'ArrowUp');
    expect(media.volumeValue).toBeCloseTo(1, 5);
    keyDown(group, 'm');
    expect(media.mutedValue).toBe(true);
    expect(screen.getByRole('button', { name: 'Unmute video' })).toBeInTheDocument();
  });

  it('enters/exits fullscreen through the button and the F shortcut', () => {
    installMediaMocks();
    render(<VideoPlayer src720p={VIDEO_SRC} />);
    const group = screen.getByRole('group', { name: 'Video player' });

    keyDown(group, 'f');
    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    expect(screen.getByRole('button', { name: 'Exit fullscreen' })).toBeInTheDocument();

    keyDown(group, 'F');
    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    expect(screen.getByRole('button', { name: 'Enter fullscreen' })).toBeInTheDocument();
  });

  it('keeps controls visible while keyboard focus stays inside the player', () => {
    vi.useFakeTimers();
    installMediaMocks();
    render(<VideoPlayer src720p={VIDEO_SRC} />);

    const group = screen.getByRole('group', { name: 'Video player' });
    const video = document.querySelector('video')!;
    fireEvent(video, new Event('play'));

    act(() => {
      vi.advanceTimersByTime(3500);
    });
    expect(group.className).toContain('cursor-none');

    act(() => {
      screen.getByRole('button', { name: 'Pause video' }).focus();
    });
    expect(group.className).not.toContain('cursor-none');
  });

  it('does not autoplay or call play on initial render', () => {
    const media = installMediaMocks();
    const { container } = render(<VideoPlayer src720p={VIDEO_SRC} />);
    const video = container.querySelector('video')!;
    expect(media.playMock).not.toHaveBeenCalled();
    expect(video).not.toHaveAttribute('autoplay');
    expect(video).toHaveAttribute('preload', 'metadata');
  });

  it('renders a kind=captions track with srcLang and label when the caption fixture loads', async () => {
    installMediaMocks();
    const { container } = render(
      <VideoPlayer src720p={VIDEO_SRC} captionSrc="https://example.com/captions.vtt" />,
    );
    await waitFor(() => {
      const track = container.querySelector('track');
      expect(track).toBeInTheDocument();
      expect(track).toHaveAttribute('kind', 'captions');
      expect(track).toHaveAttribute('srcLang', 'en');
      expect(track).toHaveAttribute('label', 'English captions');
      expect(track).toHaveAttribute('src', 'blob:mock-url');
    });
  });

  it('shows an accessible persistent status when caption loading fails', async () => {
    installMediaMocks();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    render(<VideoPlayer src720p={VIDEO_SRC} captionSrc="https://example.com/captions.vtt" />);

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        'Captions could not be loaded for this video.',
      );
    });
  });

  it('does not render a track or the Captions toggle when the caption request returns an HTTP error', async () => {
    installMediaMocks();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        blob: () => Promise.resolve(new Blob(['WEBVTT'])),
      }),
    );
    const { container } = render(
      <VideoPlayer src720p={VIDEO_SRC} captionSrc="https://example.com/missing.vtt" />,
    );

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        'Captions could not be loaded for this video.',
      );
    });
    expect(container.querySelector('track')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Captions' })).not.toBeInTheDocument();
    await assertNoSeriousViolations(container);
  });

  it('does not render stale caption state after a captionSrc change', async () => {
    installMediaMocks();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        blob: () => Promise.resolve(new Blob(['WEBVTT'])),
      }),
    );
    const { container, rerender } = render(
      <VideoPlayer src720p={VIDEO_SRC} captionSrc="https://example.com/first.vtt" />,
    );
    await waitFor(() => expect(container.querySelector('track')).toBeInTheDocument());

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        blob: () => Promise.resolve(new Blob(['WEBVTT'])),
      }),
    );
    rerender(
      <VideoPlayer src720p={VIDEO_SRC} captionSrc="https://example.com/missing.vtt" />,
    );

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        'Captions could not be loaded for this video.',
      );
    });
    expect(container.querySelector('track')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Captions' })).not.toBeInTheDocument();
  });

  describe('settings menu keyboard interaction', () => {
    it('moves focus into the menu on open, navigates items with Arrow keys, and closes with Escape returning focus to the trigger', () => {
      installMediaMocks();
      render(<VideoPlayer src720p={VIDEO_SRC} src480p="https://example.com/video-480p.mp4" />);

      const settingsBtn = screen.getByRole('button', { name: 'Settings' });
      expect(settingsBtn).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(settingsBtn);
      expect(settingsBtn).toHaveAttribute('aria-expanded', 'true');

      const menu = screen.getByRole('menu', { name: 'Playback settings' });
      const items = Array.from(menu.querySelectorAll('button'));
      const normalIndex = items.indexOf(screen.getByRole('menuitemradio', { name: 'Normal' }));
      expect(document.activeElement).toBe(items[normalIndex]); // "Normal" speed is checked initially

      keyDown(menu, 'ArrowDown');
      expect(document.activeElement).toBe(items[normalIndex + 1]);
      keyDown(menu, 'ArrowUp');
      expect(document.activeElement).toBe(items[normalIndex]);
      keyDown(menu, 'ArrowUp');
      expect(document.activeElement).toBe(items[normalIndex - 1]);

      keyDown(menu, 'Escape');
      expect(screen.queryByRole('menu', { name: 'Playback settings' })).not.toBeInTheDocument();
      expect(document.activeElement).toBe(settingsBtn);
      expect(settingsBtn).toHaveAttribute('aria-expanded', 'false');
    });

    it('closes and refocuses the trigger after selecting a speed or quality option', () => {
      installMediaMocks();
      render(<VideoPlayer src720p={VIDEO_SRC} src480p="https://example.com/video-480p.mp4" />);

      const settingsBtn = screen.getByRole('button', { name: 'Settings' });
      fireEvent.click(settingsBtn);
      fireEvent.click(screen.getByRole('menuitemradio', { name: '2x' }));

      expect(screen.queryByRole('menu', { name: 'Playback settings' })).not.toBeInTheDocument();
      expect(document.activeElement).toBe(settingsBtn);
    });
  });
});
