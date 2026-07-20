import { useState, useRef, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  Subtitles, ChevronDown, RotateCcw, RotateCw,
  Film, Clock, CheckCircle, Sparkles, Search, X,
} from 'lucide-react';
import useApi from '../../hooks/useApi';
import elearningService from '../../services/elearning';

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// ─── Lecteur vidéo personnalisé ───────────────────────────────────────────────
function VideoPlayer({ video, onProgress, resumeAt = 0 }) {
  const videoRef   = useRef(null);
  const hlsRef     = useRef(null);
  const wrapRef    = useRef(null);
  const saveTimer  = useRef(null);

  const [playing, setPlaying]     = useState(false);
  const [muted, setMuted]         = useState(false);
  const [volume, setVolume]       = useState(1);
  const [currentTime, setCurrent] = useState(0);
  const [duration, setDuration]   = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [speed, setSpeed]         = useState(1);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [subOpen, setSubOpen]     = useState(false);
  const [activeSubLang, setActiveSub] = useState('off');
  const [showControls, setShowControls] = useState(true);
  const [watermark, setWatermark] = useState('');
  const controlsTimer = useRef(null);

  // Build student watermark from localStorage profile
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (video.watermark_enabled) {
        const tpl = video.watermark_template || '{student_name}';
        const wm  = tpl
          .replace('{student_name}', `${user.first_name || ''} ${user.last_name || ''}`.trim())
          .replace('{matricule}', user.matricule || '')
          .replace('{date}', new Date().toLocaleDateString('fr'));
        setWatermark(wm);
      }
    } catch {}
  }, [video]);

  // HLS / MP4 setup
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const url = video.video_url || video.source_url;
    if (!url) return;

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    if (video.source_type === 'HLS' && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hls.loadSource(url);
      hls.attachMedia(el);
      hlsRef.current = hls;
    } else if (video.source_type === 'FILE' || video.source_type === 'EXTERNAL') {
      el.src = url;
    }

    el.onloadedmetadata = () => {
      setDuration(el.duration);
      if (resumeAt > 10) { el.currentTime = resumeAt; }
    };
    el.ontimeupdate  = () => setCurrent(el.currentTime);
    el.onplay  = () => setPlaying(true);
    el.onpause = () => setPlaying(false);
    el.onended = () => { setPlaying(false); onProgress(el.currentTime, true); };

    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
      clearInterval(saveTimer.current);
    };
  }, [video.id]);

  // Auto-save progress every 15s
  useEffect(() => {
    clearInterval(saveTimer.current);
    saveTimer.current = setInterval(() => {
      if (playing && videoRef.current) {
        onProgress(videoRef.current.currentTime, false);
      }
    }, 15000);
    return () => clearInterval(saveTimer.current);
  }, [playing, onProgress]);

  // Anti-copy: block right-click
  useEffect(() => {
    if (!video.disable_right_click) return;
    const prevent = (e) => e.preventDefault();
    const el = wrapRef.current;
    if (el) el.addEventListener('contextmenu', prevent);
    return () => { if (el) el.removeEventListener('contextmenu', prevent); };
  }, [video.disable_right_click]);

  // Controls hide timer
  const showCtrl = () => {
    setShowControls(true);
    clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), 3000);
  };

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) el.play();
    else el.pause();
  };

  const seek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const t = ratio * duration;
    videoRef.current.currentTime = t;
    setCurrent(t);
  };

  const toggleMute = () => {
    const el = videoRef.current;
    el.muted = !el.muted;
    setMuted(el.muted);
  };

  const changeVolume = (e) => {
    const v = parseFloat(e.target.value);
    videoRef.current.volume = v;
    setVolume(v);
    setMuted(v === 0);
  };

  const changeSpeed = (s) => {
    videoRef.current.playbackRate = s;
    setSpeed(s);
    setSpeedOpen(false);
  };

  const skip = (delta) => {
    videoRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + delta));
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      wrapRef.current.requestFullscreen?.();
      setFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setFullscreen(false);
    }
  };

  // Subtitle tracks
  const subtitles = video.subtitles || [];

  // YouTube / Vimeo embed
  if (video.source_type === 'YOUTUBE' || video.source_type === 'VIMEO') {
    const url = video.source_url;
    return (
      <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden">
        <iframe src={url} className="w-full h-full" allowFullScreen allow="autoplay; encrypted-media" title={video.title} />
      </div>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div ref={wrapRef} onMouseMove={showCtrl} onClick={showCtrl}
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden select-none group">

      <video ref={videoRef} className="w-full h-full" crossOrigin="anonymous"
        onClick={togglePlay}>
        {subtitles.map(s => (
          <track key={s.language_code} kind="subtitles" src={s.file_url || s.file}
            srcLang={s.language_code} label={s.language_label}
            default={activeSubLang === s.language_code} />
        ))}
      </video>

      {/* Watermark overlay */}
      {watermark && (
        <div className="absolute inset-0 pointer-events-none">
          <span className="absolute bottom-16 right-4 text-white/30 text-xs font-medium select-none">
            {watermark}
          </span>
        </div>
      )}

      {/* Controls overlay */}
      <div className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-300 ${showControls || !playing ? 'opacity-100' : 'opacity-0'}`}>
        {/* Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

        {/* Center play/pause */}
        {!playing && (
          <button onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              <Play size={28} className="text-white ml-1" />
            </div>
          </button>
        )}

        {/* Controls bar */}
        <div className="relative px-4 pb-4 space-y-2">
          {/* Progress bar */}
          <div onClick={seek} className="w-full h-1.5 bg-white/30 rounded-full cursor-pointer group/bar hover:h-2.5 transition-all">
            <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${progress}%` }} />
          </div>

          {/* Buttons row */}
          <div className="flex items-center gap-2">
            {/* Skip back */}
            <button onClick={() => skip(-10)} className="text-white hover:text-indigo-300 p-1">
              <RotateCcw size={16} />
            </button>

            {/* Play/Pause */}
            <button onClick={togglePlay} className="text-white hover:text-indigo-300 p-1">
              {playing ? <Pause size={20} /> : <Play size={20} />}
            </button>

            {/* Skip forward */}
            <button onClick={() => skip(10)} className="text-white hover:text-indigo-300 p-1">
              <RotateCw size={16} />
            </button>

            {/* Volume */}
            <button onClick={toggleMute} className="text-white hover:text-indigo-300 p-1">
              {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
              onChange={changeVolume}
              className="w-16 accent-indigo-400" />

            {/* Time */}
            <span className="text-white text-xs ml-1">{formatTime(currentTime)} / {formatTime(duration)}</span>

            <div className="flex-1" />

            {/* Speed */}
            <div className="relative">
              <button onClick={() => setSpeedOpen(v => !v)}
                className="text-white text-xs hover:text-indigo-300 flex items-center gap-0.5 border border-white/30 px-2 py-0.5 rounded">
                {speed}x <ChevronDown size={11} />
              </button>
              {speedOpen && (
                <div className="absolute bottom-8 right-0 bg-gray-900 rounded-xl overflow-hidden shadow-xl z-20">
                  {SPEED_OPTIONS.map(s => (
                    <button key={s} onClick={() => changeSpeed(s)}
                      className={`block w-full text-left px-4 py-1.5 text-sm hover:bg-gray-700 ${speed === s ? 'text-indigo-400 font-semibold' : 'text-white'}`}>
                      {s}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Subtitles */}
            {subtitles.length > 0 && (
              <div className="relative">
                <button onClick={() => setSubOpen(v => !v)}
                  className={`p-1 ${activeSubLang !== 'off' ? 'text-indigo-400' : 'text-white'} hover:text-indigo-300`}>
                  <Subtitles size={18} />
                </button>
                {subOpen && (
                  <div className="absolute bottom-8 right-0 bg-gray-900 rounded-xl overflow-hidden shadow-xl z-20 min-w-32">
                    <button onClick={() => { setActiveSub('off'); setSubOpen(false); const tracks = videoRef.current?.textTracks; for (let t of tracks) t.mode = 'disabled'; }}
                      className={`block w-full text-left px-4 py-1.5 text-sm hover:bg-gray-700 ${activeSubLang === 'off' ? 'text-indigo-400' : 'text-white'}`}>
                      Désactivés
                    </button>
                    {subtitles.map(s => (
                      <button key={s.language_code} onClick={() => {
                        setActiveSub(s.language_code); setSubOpen(false);
                        const tracks = videoRef.current?.textTracks;
                        for (let t of tracks) {
                          t.mode = t.language === s.language_code ? 'showing' : 'disabled';
                        }
                      }}
                        className={`block w-full text-left px-4 py-1.5 text-sm hover:bg-gray-700 ${activeSubLang === s.language_code ? 'text-indigo-400' : 'text-white'}`}>
                        {s.language_label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Fullscreen */}
            <button onClick={toggleFullscreen} className="text-white hover:text-indigo-300 p-1">
              {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page principale Vidéothèque ─────────────────────────────────────────────
export default function StudentVideoLibrary() {
  const [search, setSearch] = useState('');
  const [activeVideo, setActiveVideo] = useState(null);

  const { data: videosData, loading } = useApi(
    () => elearningService.getVideos({ is_published: true }), []
  );
  const { data: progressData, refetch: refetchProgress } = useApi(
    () => elearningService.getMyVideoProgress(), []
  );
  const { data: recoData } = useApi(
    () => elearningService.getVideoRecommendations(), []
  );

  const videos    = videosData?.results ?? videosData ?? [];
  const progList  = progressData?.results ?? progressData ?? [];
  const recos     = recoData ?? [];

  const getProgress = (videoId) => progList.find(p => p.video === videoId);

  const filtered = videos.filter(v =>
    !search || v.title.toLowerCase().includes(search.toLowerCase()) || (v.tags || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleProgress = useCallback(async (position, completed) => {
    if (!activeVideo) return;
    try {
      await elearningService.trackVideoProgress(activeVideo.id, Math.floor(position), completed);
      refetchProgress();
    } catch {}
  }, [activeVideo, refetchProgress]);

  const openVideo = (v) => {
    setActiveVideo(v);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resumeAt = activeVideo ? (getProgress(activeVideo.id)?.position_seconds || 0) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Player section */}
      {activeVideo && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveVideo(null)}
              className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200">
              <X size={16} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{activeVideo.title}</h1>
              <p className="text-sm text-gray-500">{activeVideo.class_name} · {activeVideo.subject_name}</p>
            </div>
          </div>

          <VideoPlayer
            key={activeVideo.id}
            video={activeVideo}
            resumeAt={resumeAt}
            onProgress={handleProgress}
          />

          {activeVideo.description && (
            <p className="text-sm text-gray-600 leading-relaxed">{activeVideo.description}</p>
          )}

          {/* Tags */}
          {activeVideo.tags && (
            <div className="flex flex-wrap gap-2">
              {activeVideo.tags.split(',').map(t => (
                <span key={t} className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs">{t.trim()}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recommandations IA */}
      {!activeVideo && recos.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Sparkles size={18} className="text-indigo-500" /> Recommandées pour vous
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {recos.map(v => (
              <VideoCard key={v.id} video={v} progress={getProgress(v.id)} onClick={() => openVideo(v)} compact />
            ))}
          </div>
        </div>
      )}

      {/* Recherche */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une vidéo..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm" />
        </div>
      </div>

      {/* Grille vidéos */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-gray-900">
          {search ? `Résultats pour "${search}"` : 'Toutes les vidéos'}
          <span className="text-sm font-normal text-gray-400 ml-2">{filtered.length}</span>
        </h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Film size={40} className="mx-auto mb-3 opacity-30" />
            <p>Aucune vidéo disponible</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(v => (
              <VideoCard key={v.id} video={v} progress={getProgress(v.id)} onClick={() => openVideo(v)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function VideoCard({ video, progress, onClick, compact }) {
  const watched = progress?.position_seconds || 0;
  const total   = video.duration_seconds || 1;
  const pct     = Math.min(100, Math.round((watched / total) * 100));

  return (
    <div onClick={onClick}
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden ${compact ? 'w-52 flex-shrink-0' : ''}`}>
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gray-100">
        {video.thumbnail_url ? (
          <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film size={32} className="text-gray-300" />
          </div>
        )}
        {/* Progress bar */}
        {pct > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
          </div>
        )}
        {/* Completed badge */}
        {progress?.is_completed && (
          <div className="absolute top-2 right-2 bg-green-500 rounded-full p-0.5">
            <CheckCircle size={14} className="text-white" />
          </div>
        )}
        {/* Duration badge */}
        {video.duration_seconds > 0 && (
          <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
            {formatTime(video.duration_seconds)}
          </span>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30">
          <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
            <Play size={20} className="text-indigo-600 ml-0.5" />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-gray-900 text-sm truncate">{video.title}</h3>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{video.subject_name}</p>
        {pct > 0 && !progress?.is_completed && (
          <p className="text-xs text-indigo-500 mt-1">{pct}% visionné — reprendre</p>
        )}
      </div>
    </div>
  );
}
