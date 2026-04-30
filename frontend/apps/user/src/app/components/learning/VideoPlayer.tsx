import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  Loader2,
  Maximize,
  Minimize,
  Pause,
  Play,
  Settings,
  Volume2,
  VolumeX,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface VideoPlayerProps {
  src720p?: string | null;
  src480p?: string | null;
  fallbackSrc?: string | null;
  /** Cloudinary URL of the WebVTT caption file produced by Whisper transcription */
  captionSrc?: string | null;
  onTimeUpdate?: () => void;
  onLoadedMetadata?: () => void;
  onEnded?: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
const CONTROLS_HIDE_DELAY = 3000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}


// ─── Component ────────────────────────────────────────────────────────────────

export const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  ({ src720p, src480p, fallbackSrc, captionSrc, onTimeUpdate, onLoadedMetadata, onEnded }, forwardedRef) => {
    // Refs
    const videoEl = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const playbackToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const playbackToastCleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingSeekRef = useRef<number | null>(null);
    const lastNonZeroVolumeRef = useRef(1);
    const settingsPanelRef = useRef<HTMLDivElement>(null);
    const settingsBtnRef = useRef<HTMLButtonElement>(null);

    // Expose raw HTMLVideoElement to parent
    useImperativeHandle(forwardedRef, () => videoEl.current!, []);

    // State
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [bufferedEnd, setBufferedEnd] = useState(0);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [selectedQuality, setSelectedQuality] = useState<'720p' | '480p'>('720p');
    const [isQualitySwitching, setIsQualitySwitching] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [playbackToast, setPlaybackToast] = useState<'play' | 'pause' | null>(null);
    const [playbackToastVisible, setPlaybackToastVisible] = useState(false);
    const [captionEnabled, setCaptionEnabled] = useState(false);
    const [captionBlobUrl, setCaptionBlobUrl] = useState<string | null>(null);

    // Derived
    const hasQualityOptions = Boolean(src720p && src480p);

    const currentSrc =
      selectedQuality === '480p'
        ? (src480p ?? fallbackSrc ?? undefined)
        : (src720p ?? fallbackSrc ?? undefined);

    // ── Controls auto-hide ────────────────────────────────────────────────────

    const resetControlsTimer = useCallback(() => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
      setShowControls(true);
      controlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, CONTROLS_HIDE_DELAY);
    }, []);

    const handleMouseMove = useCallback(() => {
      resetControlsTimer();
    }, [resetControlsTimer]);

    const handleMouseLeave = useCallback(() => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
      if (playing && !showSettings) setShowControls(false);
    }, [playing, showSettings]);

    // Keep controls visible when paused or settings open
    useEffect(() => {
      if (!playing || showSettings) {
        if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
        setShowControls(true);
      } else {
        resetControlsTimer();
      }
    }, [playing, showSettings, resetControlsTimer]);

    // ── Fullscreen sync ───────────────────────────────────────────────────────

    useEffect(() => {
      const onFsChange = () => {
        setIsFullscreen(Boolean(document.fullscreenElement));
      };
      document.addEventListener('fullscreenchange', onFsChange);
      return () => document.removeEventListener('fullscreenchange', onFsChange);
    }, []);

    // ── Fetch VTT as blob URL (avoids crossOrigin on video breaking duration) ─

    useEffect(() => {
      if (!captionSrc) {
        setCaptionBlobUrl(null);
        return;
      }
      let objectUrl: string | null = null;
      fetch(captionSrc)
        .then((r) => r.blob())
        .then((blob) => {
          objectUrl = URL.createObjectURL(blob);
          setCaptionBlobUrl(objectUrl);
        })
        .catch(() => setCaptionBlobUrl(null));
      return () => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      };
    }, [captionSrc]);

    // ── Sync native caption track mode ───────────────────────────────────────

    useEffect(() => {
      const video = videoEl.current;
      if (!video || !captionBlobUrl) return;
      const applyMode = () => {
        const mode = captionEnabled ? 'showing' : 'hidden';
        for (let i = 0; i < video.textTracks.length; i++) {
          video.textTracks[i].mode = mode;
        }
      };
      applyMode();
      video.textTracks.addEventListener('addtrack', applyMode);
      return () => video.textTracks.removeEventListener('addtrack', applyMode);
    }, [captionEnabled, captionBlobUrl]);

    // ── Click outside settings ────────────────────────────────────────────────

    useEffect(() => {
      if (!showSettings) return;
      const onClickOutside = (e: MouseEvent) => {
        if (
          settingsPanelRef.current &&
          !settingsPanelRef.current.contains(e.target as Node) &&
          !settingsBtnRef.current?.contains(e.target as Node)
        ) {
          setShowSettings(false);
        }
      };
      document.addEventListener('mousedown', onClickOutside);
      return () => document.removeEventListener('mousedown', onClickOutside);
    }, [showSettings]);

    // Cleanup timer on unmount
    useEffect(() => {
      return () => {
        if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
        if (playbackToastTimerRef.current) clearTimeout(playbackToastTimerRef.current);
        if (playbackToastCleanupTimerRef.current) clearTimeout(playbackToastCleanupTimerRef.current);
      };
    }, []);

    // ── Video event handlers ──────────────────────────────────────────────────

    const handleLoadedMetadata = useCallback(() => {
      const v = videoEl.current;
      if (!v) return;
      setDuration(v.duration);

      // Quality switch: restore seek position, don't call parent
      if (pendingSeekRef.current !== null) {
        v.currentTime = pendingSeekRef.current;
        pendingSeekRef.current = null;
        setIsQualitySwitching(false);
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        v.play().catch(() => {});
        return;
      }

      // Normal video load: let parent restore lesson progress
      onLoadedMetadata?.();
    }, [onLoadedMetadata]);

    const handleTimeUpdate = useCallback(() => {
      const v = videoEl.current;
      if (!v) return;
      setCurrentTime(v.currentTime);

      // Update buffered end
      if (v.buffered.length > 0) {
        setBufferedEnd((v.buffered.end(v.buffered.length - 1) / v.duration) * 100);
      }

      onTimeUpdate?.();
    }, [onTimeUpdate]);

    const handlePlay = useCallback(() => setPlaying(true), []);
    const handlePause = useCallback(() => setPlaying(false), []);

    const handleWaiting = useCallback(() => setIsBuffering(true), []);
    const handleCanPlay = useCallback(() => setIsBuffering(false), []);

    const handleEnded = useCallback(() => {
      setPlaying(false);
      onEnded?.();
    }, [onEnded]);

    // ── Playback controls ─────────────────────────────────────────────────────

    const showPlaybackToast = useCallback((type: 'play' | 'pause') => {
      setPlaybackToast(type);
      setPlaybackToastVisible(true);

      if (playbackToastTimerRef.current) clearTimeout(playbackToastTimerRef.current);
      if (playbackToastCleanupTimerRef.current) clearTimeout(playbackToastCleanupTimerRef.current);

      playbackToastTimerRef.current = setTimeout(() => {
        setPlaybackToastVisible(false);
      }, 420);

      playbackToastCleanupTimerRef.current = setTimeout(() => {
        setPlaybackToast(null);
      }, 980);
    }, []);

    const togglePlay = useCallback(() => {
      const v = videoEl.current;
      if (!v) return;
      if (v.paused) {
        showPlaybackToast('play');
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        v.play().catch(() => {});
      } else {
        showPlaybackToast('pause');
        v.pause();
      }
    }, [showPlaybackToast]);

    const seek = useCallback((seconds: number) => {
      const v = videoEl.current;
      if (!v) return;
      v.currentTime = clamp(v.currentTime + seconds, 0, v.duration);
    }, []);

    const handleSeekBar = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const v = videoEl.current;
      if (!v) return;
      v.currentTime = Number(e.target.value);
      setCurrentTime(Number(e.target.value));
    }, []);

    const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const v = videoEl.current;
      if (!v) return;
      const val = Number(e.target.value);

      if (val > 0) {
        lastNonZeroVolumeRef.current = val;
      }

      v.volume = val;
      v.muted = val === 0;
      setVolume(val);
      setMuted(val === 0);
    }, []);

    const toggleMute = useCallback(() => {
      const v = videoEl.current;
      if (!v) return;

      if (v.muted || v.volume === 0) {
        const restored = clamp(lastNonZeroVolumeRef.current || 0.6, 0.05, 1);
        v.muted = false;
        v.volume = restored;
        setMuted(false);
        setVolume(restored);
        return;
      }

      lastNonZeroVolumeRef.current = v.volume;
      v.muted = true;
      setMuted(true);
    }, []);

    const changeSpeed = useCallback((speed: number) => {
      const v = videoEl.current;
      if (!v) return;
      v.playbackRate = speed;
      setPlaybackSpeed(speed);
      setShowSettings(false);
    }, []);

    const cycleSpeed = useCallback(() => {
      const currentIndex = SPEEDS.findIndex((s) => s === playbackSpeed);
      const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % SPEEDS.length;
      changeSpeed(SPEEDS[nextIndex]);
    }, [changeSpeed, playbackSpeed]);

    const switchQuality = useCallback(
      (quality: '720p' | '480p') => {
        const v = videoEl.current;
        if (!v || quality === selectedQuality) return;
        pendingSeekRef.current = v.currentTime;
        setIsQualitySwitching(true);
        setSelectedQuality(quality);
        setShowSettings(false);
      },
      [selectedQuality],
    );

    const toggleFullscreen = useCallback(() => {
      const el = containerRef.current;
      if (!el) return;
      if (!document.fullscreenElement) {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        el.requestFullscreen().catch(() => {});
      } else {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        document.exitFullscreen().catch(() => {});
      }
    }, []);

    // ── Keyboard shortcuts ────────────────────────────────────────────────────

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if ((e.target as HTMLElement).tagName === 'INPUT') return;
        switch (e.key) {
          case ' ':
          case 'k':
          case 'K':
            e.preventDefault();
            togglePlay();
            break;
          case 'ArrowLeft':
          case 'j':
          case 'J':
            e.preventDefault();
            seek(-5);
            break;
          case 'ArrowRight':
          case 'l':
          case 'L':
            e.preventDefault();
            seek(5);
            break;
          case 'ArrowUp':
            e.preventDefault();
            if (videoEl.current) {
              const newVol = clamp(videoEl.current.volume + 0.1, 0, 1);
              videoEl.current.volume = newVol;
              videoEl.current.muted = false;
              setMuted(false);
              setVolume(newVol);
              if (newVol > 0) lastNonZeroVolumeRef.current = newVol;
            }
            break;
          case 'ArrowDown':
            e.preventDefault();
            if (videoEl.current) {
              const newVol = clamp(videoEl.current.volume - 0.1, 0, 1);
              videoEl.current.volume = newVol;
              videoEl.current.muted = newVol === 0;
              setMuted(newVol === 0);
              setVolume(newVol);
              if (newVol > 0) lastNonZeroVolumeRef.current = newVol;
            }
            break;
          case 'f':
          case 'F':
            e.preventDefault();
            toggleFullscreen();
            break;
          case 'm':
          case 'M':
            e.preventDefault();
            toggleMute();
            break;
        }
      },
      [togglePlay, seek, toggleFullscreen, toggleMute],
    );

    // ── Render ────────────────────────────────────────────────────────────────

    const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
    const showSpinner = isBuffering || isQualitySwitching;
    const controlsVisible = showControls || !playing;
    const effectiveVolume = muted ? 0 : volume;
    const volumePct = Math.round(effectiveVolume * 100);

    return (
      <div
        ref={containerRef}
        className={`relative mx-auto w-full bg-black aspect-video max-h-[calc(100vh-180px)] xl:max-h-[calc(100vh-220px)] select-none outline-none group ${
          controlsVisible ? 'cursor-default' : 'cursor-none'
        }`}
        tabIndex={0}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onKeyDown={handleKeyDown}
      >
        {/* ── Video element ── */}
        <video
          ref={videoEl}
          src={currentSrc ?? undefined}
          className="w-full h-full object-contain"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
          onWaiting={handleWaiting}
          onCanPlay={handleCanPlay}
          onClick={togglePlay}
          onDoubleClick={toggleFullscreen}
          preload="metadata"
        >
          {captionBlobUrl && (
            <track kind="subtitles" src={captionBlobUrl} />
          )}
        </video>

        {/* ── Spinner ── */}
        {showSpinner && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Loader2 className="w-12 h-12 text-white/80 animate-spin" />
          </div>
        )}

        {/* ── Center playback feedback ── */}
        {playbackToast && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div
              className={`h-16 w-16 rounded-full bg-black/60 text-white ring-1 ring-white/25 shadow-[0_10px_30px_rgba(0,0,0,0.45)] flex items-center justify-center transition-opacity duration-500 ease-out ${
                playbackToastVisible ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {playbackToast === 'play' ? (
                <Play className="h-8 w-8 fill-white ml-0.5" />
              ) : (
                <Pause className="h-8 w-8 fill-white" />
              )}
            </div>
          </div>
        )}

        {/* ── Controls overlay ── */}
        <div
          className={`absolute inset-0 pointer-events-none flex flex-col justify-end transition-opacity duration-300 ${
            controlsVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Gradient fade */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

          {/* ── Settings panel ── */}
          {showSettings && (
            <div
              ref={settingsPanelRef}
              className="absolute bottom-16 right-3 pointer-events-auto bg-black/90 rounded-lg p-3 min-w-[160px] z-10 shadow-xl border border-white/10"
            >
              {/* Speed */}
              <p className="text-white/50 text-[11px] font-semibold uppercase tracking-wider mb-2">
                Speed
              </p>
              <div className="flex flex-wrap gap-1 mb-3">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    onClick={() => changeSpeed(s)}
                    className={`px-2 py-0.5 text-xs rounded transition-colors ${
                      playbackSpeed === s
                        ? 'bg-white text-black font-semibold'
                        : 'text-white hover:bg-white/20'
                    }`}
                  >
                    {s === 1 ? 'Normal' : `${s}x`}
                  </button>
                ))}
              </div>

              {/* Quality — only show if both variants available */}
              {hasQualityOptions && (
                <>
                  <div className="border-t border-white/10 my-2" />
                  <p className="text-white/50 text-[11px] font-semibold uppercase tracking-wider mb-2">
                    Quality
                  </p>
                  <div className="flex gap-1">
                    {(['480p', '720p'] as const).map((q) => (
                      <button
                        key={q}
                        onClick={() => switchQuality(q)}
                        className={`px-2 py-0.5 text-xs rounded transition-colors ${
                          selectedQuality === q
                            ? 'bg-white text-black font-semibold'
                            : 'text-white hover:bg-white/20'
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Progress bar ── */}
          <div className="px-3 pb-2 z-10 group/progress pointer-events-auto">
            <div className="relative h-1 group-hover/progress:h-[5px] transition-all duration-150 rounded-full bg-white/20 cursor-pointer">
              {/* Buffered */}
              <div
                className="absolute inset-y-0 left-0 bg-white/40 rounded-full pointer-events-none"
                style={{ width: `${bufferedEnd}%` }}
              />
              {/* Progress */}
              <div
                className="absolute inset-y-0 left-0 bg-blue-600 rounded-full pointer-events-none"
                style={{ width: `${progressPct}%` }}
              />
              {/* Thumb dot */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-600 rounded-full pointer-events-none opacity-0 group-hover/progress:opacity-100 transition-opacity"
                style={{ left: `calc(${progressPct}% - 6px)` }}
              />
              {/* Invisible range input for interaction */}
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={currentTime}
                onChange={handleSeekBar}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>

          {/* ── Bottom controls row ── */}
          <div className="relative flex items-center justify-between px-3 pb-3 z-10 pointer-events-auto">
            {/* Left: play + time */}
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className="text-white hover:text-white/80 transition-colors p-1"
                aria-label={playing ? 'Pause' : 'Play'}
              >
                {playing ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
              </button>

              <span className="text-white text-xs tabular-nums whitespace-nowrap">
                {formatTime(currentTime)}{' '}
                <span className="text-white/50">/</span>{' '}
                {formatTime(duration)}
              </span>
            </div>

            {/* Right: volume + speed badge + settings + fullscreen */}
            <div className="flex items-center h-8 gap-1.5">
              {/* Volume */}
              <div className="flex items-center gap-1.5 h-8">
                <button
                  onClick={toggleMute}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md text-white hover:text-white/80 transition-colors"
                  aria-label={muted ? 'Unmute' : 'Mute'}
                >
                  {muted || volume === 0 ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={effectiveVolume}
                  onChange={handleVolumeChange}
                  aria-label="Volume"
                  className="w-12 sm:w-14
                    h-1 appearance-none cursor-pointer rounded-full
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-3
                    [&::-webkit-slider-thumb]:h-3
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-white
                    [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_rgba(0,0,0,0.25)]
                    [&::-moz-range-thumb]:w-3
                    [&::-moz-range-thumb]:h-3
                    [&::-moz-range-thumb]:rounded-full
                    [&::-moz-range-thumb]:bg-white
                    [&::-moz-range-thumb]:border-0
                  "
                  style={{
                    background: `linear-gradient(to right, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.95) ${volumePct}%, rgba(255,255,255,0.30) ${volumePct}%, rgba(255,255,255,0.30) 100%)`,
                  }}
                />
              </div>

              {/* Speed badge */}
              <button
                onClick={cycleSpeed}
                className="h-8 min-w-[42px] inline-flex items-center justify-center rounded-md border border-transparent px-2 text-white/70 hover:text-white text-xs font-medium tabular-nums leading-none transition-colors"
                aria-label="Change playback speed"
              >
                {playbackSpeed === 1 ? '1×' : `${playbackSpeed}×`}
              </button>

              {/* CC (captions) toggle — only shown when a VTT file is available */}
              {captionSrc && (
                <button
                  onClick={() => setCaptionEnabled((v) => !v)}
                  className={`h-8 min-w-[42px] inline-flex items-center justify-center rounded-md border px-2 text-[11px] font-bold leading-none transition-colors ${
                    captionEnabled
                      ? 'border-white bg-white text-black'
                      : 'border-white/40 text-white/70 hover:text-white hover:border-white/70'
                  }`}
                  aria-label={captionEnabled ? 'Disable captions' : 'Enable captions'}
                >
                  CC
                </button>
              )}

              {/* Settings gear */}
              <button
                ref={settingsBtnRef}
                onClick={() => setShowSettings((v) => !v)}
                className={`h-8 w-8 inline-flex items-center justify-center rounded-md border border-transparent transition-colors ${showSettings ? 'text-white' : 'text-white/70 hover:text-white'}`}
                aria-label="Settings"
              >
                <Settings className={`w-4 h-4 transition-transform duration-300 ${showSettings ? 'rotate-45' : ''}`} />
              </button>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-transparent text-white/70 hover:text-white transition-colors"
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;
