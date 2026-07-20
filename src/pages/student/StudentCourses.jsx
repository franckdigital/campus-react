import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers, Lock, CheckCircle2, Circle, PlayCircle, ChevronDown, ChevronRight,
  BookOpen, X, FileText, Film, Music, Image as ImageIcon, Paperclip, Type, Code,
  ClipboardCheck, TrendingUp,
} from 'lucide-react';
import { studentsService } from '../../services/students';
import { elearningService } from '../../services/elearning';
import { useApi } from '../../hooks/useApi';

function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="h-10 w-10 rounded-full border-[3px] animate-spin"
           style={{ borderColor: '#fce7f3', borderTopColor: '#db2777' }} />
      <p className="text-sm font-semibold" style={{ color: '#64748b' }}>Chargement…</p>
    </div>
  );
}

function toEmbedUrl(type, url) {
  if (!url) return '';
  if (type === 'YOUTUBE') {
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]+)/);
    return m ? `https://www.youtube.com/embed/${m[1]}` : url;
  }
  if (type === 'VIMEO') {
    const m = url.match(/vimeo\.com\/(\d+)/);
    return m ? `https://player.vimeo.com/video/${m[1]}` : url;
  }
  return url;
}

function ContentBlock({ block, onVideoRef }) {
  switch (block.block_type) {
    case 'TEXT':
      return <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#334155' }}>{block.content}</p>;
    case 'HTML':
      return <div className="text-sm leading-relaxed" style={{ color: '#334155' }} dangerouslySetInnerHTML={{ __html: block.content }} />;
    case 'VIDEO':
      return (
        <video ref={onVideoRef} controls className="w-full rounded-xl" style={{ maxHeight: 480, background: '#000' }} src={block.file}>
          Votre navigateur ne supporte pas la vidéo.
        </video>
      );
    case 'AUDIO':
      return <audio controls className="w-full" src={block.file} />;
    case 'IMAGE':
      return <img src={block.file} alt={block.title} className="w-full rounded-xl" />;
    case 'PDF':
      return (
        <div className="space-y-2">
          <iframe src={block.file} title={block.title} className="w-full rounded-xl" style={{ height: 480, border: '1px solid #f0f4f9' }} />
          <a href={block.file} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold" style={{ color: '#db2777' }}>Ouvrir le PDF dans un nouvel onglet</a>
        </div>
      );
    case 'IFRAME':
    case 'YOUTUBE':
    case 'VIMEO':
      return (
        <iframe src={toEmbedUrl(block.block_type, block.url)} title={block.title} allowFullScreen
          className="w-full rounded-xl" style={{ height: 420, border: '1px solid #f0f4f9' }} />
      );
    default:
      return (
        <a href={block.file} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#fdf2f8', color: '#db2777' }}>
          <Paperclip className="h-4 w-4" /> Télécharger {block.title}
        </a>
      );
  }
}

const BLOCK_ICONS = {
  TEXT: Type, HTML: Code, VIDEO: Film, AUDIO: Music, IMAGE: ImageIcon,
  PDF: FileText, FILE: Paperclip, IFRAME: Layers, YOUTUBE: PlayCircle, VIMEO: PlayCircle,
};

function LessonViewerModal({ lesson, onClose, onProgressChange }) {
  const navigate = useNavigate();
  const [blocks, setBlocks] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const videoRef = useRef(null);
  const lastReportedRef = useRef(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      elearningService.getLessonAttachments(lesson.id),
      elearningService.getQuizzes({ lesson: lesson.id, is_published: true }),
    ]).then(([attRes, quizRes]) => {
      if (!active) return;
      const list = attRes?.results || attRes || [];
      setBlocks(list.slice().sort((a, b) => (a.order || 0) - (b.order || 0)));
      setQuizzes(quizRes?.results || quizRes || []);
    }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [lesson.id]);

  const reportProgress = async (watchPercent, timeSpentSeconds) => {
    try {
      const progress = await elearningService.trackLessonProgress(lesson.id, {
        watch_percent: Math.round(watchPercent), time_spent_seconds: Math.round(timeSpentSeconds),
      });
      onProgressChange?.(progress);
    } catch { /* non-blocking */ }
  };

  const handleVideoRef = (el) => {
    videoRef.current = el;
    if (!el) return;
    el.ontimeupdate = () => {
      if (!el.duration) return;
      const pct = (el.currentTime / el.duration) * 100;
      if (pct - lastReportedRef.current >= 10 || pct >= 99) {
        lastReportedRef.current = pct;
        reportProgress(pct, el.currentTime);
      }
    };
    el.onpause = () => el.duration && reportProgress((el.currentTime / el.duration) * 100, el.currentTime);
    el.onended = () => reportProgress(100, el.duration || 0);
  };

  const handleMarkComplete = async () => {
    setMarking(true);
    try {
      const progress = await elearningService.markLessonComplete(lesson.id);
      onProgressChange?.(progress);
    } catch { /* ignore */ }
    finally { setMarking(false); }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(8,12,36,0.62)', backdropFilter: 'blur(12px)', zIndex: 90 }}>
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[88vh] overflow-y-auto" style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.2)' }}>
        <div className="h-1 rounded-t-2xl" style={{ background: 'linear-gradient(90deg, #db2777, #6366f1, #8b5cf6)' }} />
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <div>
            <h2 className="text-base font-extrabold" style={{ color: '#0f172a' }}>{lesson.title}</h2>
            {lesson.description && <p className="text-xs font-semibold mt-0.5" style={{ color: '#94a3b8' }}>{lesson.description}</p>}
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ color: '#64748b' }}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          {loading ? <Spinner /> : blocks.length === 0 ? (
            <p className="text-sm text-center py-10" style={{ color: '#94a3b8' }}>Aucun contenu pour cette leçon.</p>
          ) : (
            blocks.map(block => {
              const Icon = BLOCK_ICONS[block.block_type] || FileText;
              return (
                <div key={block.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5" style={{ color: '#db2777' }} />
                    <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#64748b' }}>{block.title}</p>
                  </div>
                  <ContentBlock block={block} onVideoRef={block.block_type === 'VIDEO' ? handleVideoRef : undefined} />
                </div>
              );
            })
          )}

          <div className="pt-2 space-y-3" style={{ borderTop: '1px solid #f1f5f9' }}>
            {/* Quiz buttons */}
            {quizzes.length > 0 && (
              <div className="rounded-xl p-3 space-y-2" style={{ background: '#fdf4ff', border: '1.5px solid #e9d5ff' }}>
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#7c3aed' }}>
                  <ClipboardCheck className="inline h-3.5 w-3.5 mr-1" />Quiz associé{quizzes.length > 1 ? 's' : ''}
                </p>
                <div className="flex flex-wrap gap-2">
                  {quizzes.map(q => (
                    <button key={q.id} onClick={() => { onClose(); navigate(`/student/quiz/${q.id}?lesson=${lesson.id}`); }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
                      style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)', boxShadow: '0 4px 14px #7c3aed40' }}>
                      <ClipboardCheck className="h-4 w-4" /> {q.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end">
              <button onClick={handleMarkComplete} disabled={marking}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#059669,#10b981)', boxShadow: '0 4px 14px #05966940' }}>
                <CheckCircle2 className="h-4 w-4" /> {marking ? 'Validation…' : 'Marquer comme terminée'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LessonRow({ lesson, onOpen }) {
  const locked = !lesson.is_unlocked;
  return (
    <button onClick={() => !locked && onOpen(lesson)} disabled={locked}
      className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all disabled:cursor-not-allowed"
      style={{ border: '1.5px solid #f0f4f9', background: locked ? '#fafbfc' : '#fff', opacity: locked ? 0.65 : 1 }}
      onMouseEnter={e => { if (!locked) e.currentTarget.style.background = '#fdf2f8'; }}
      onMouseLeave={e => { if (!locked) e.currentTarget.style.background = '#fff'; }}>
      <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: locked ? '#f1f5f9' : lesson.is_completed ? '#d1fae5' : '#fdf2f8' }}>
        {locked ? <Lock className="h-3.5 w-3.5" style={{ color: '#94a3b8' }} />
          : lesson.is_completed ? <CheckCircle2 className="h-3.5 w-3.5" style={{ color: '#059669' }} />
          : <PlayCircle className="h-3.5 w-3.5" style={{ color: '#db2777' }} />}
      </div>
      <span className="text-sm font-semibold flex-1 truncate" style={{ color: locked ? '#94a3b8' : '#0f172a' }}>{lesson.title}</span>
      {locked && <span className="text-[10px] font-bold flex-shrink-0" style={{ color: '#94a3b8' }}>Verrouillée</span>}
    </button>
  );
}

function ChapterBlock({ chapter, onOpenLesson }) {
  const [open, setOpen] = useState(true);
  const locked = !chapter.is_unlocked;
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid #f0f4f9' }}>
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center gap-3 px-4 py-3.5"
        style={{ background: 'linear-gradient(135deg,#fafbff,#ffffff)' }}>
        <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: locked ? '#f1f5f9' : chapter.is_completed ? '#d1fae5' : '#fdf2f8' }}>
          {locked ? <Lock className="h-4 w-4" style={{ color: '#94a3b8' }} />
            : chapter.is_completed ? <CheckCircle2 className="h-4 w-4" style={{ color: '#059669' }} />
            : <Layers className="h-4 w-4" style={{ color: '#db2777' }} />}
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-extrabold" style={{ color: locked ? '#94a3b8' : '#0f172a' }}>{chapter.title}</p>
          <p className="text-[11px] font-semibold" style={{ color: '#94a3b8' }}>{chapter.lessons.length} leçon{chapter.lessons.length > 1 ? 's' : ''}</p>
        </div>
        {open ? <ChevronDown className="h-4 w-4" style={{ color: '#94a3b8' }} /> : <ChevronRight className="h-4 w-4" style={{ color: '#94a3b8' }} />}
      </button>
      {open && (
        <div className="p-3 space-y-2" style={{ borderTop: '1px solid #f0f4f9' }}>
          {chapter.lessons.length === 0 ? (
            <p className="text-xs text-center py-3" style={{ color: '#94a3b8' }}>Aucune leçon dans ce chapitre.</p>
          ) : chapter.lessons.map(lesson => <LessonRow key={lesson.id} lesson={lesson} onOpen={onOpenLesson} />)}
        </div>
      )}
    </div>
  );
}

export default function StudentCourses() {
  const [selectedSubject, setSelectedSubject] = useState('');
  const [openLesson, setOpenLesson] = useState(null);
  const [pathOverride, setPathOverride] = useState(null);

  const { data: profile, loading: loadProfile } = useApi(() => studentsService.getMe(), [], true);
  const classId = profile?.current_class?.id;

  const { data: lessonsData, loading: loadLessons } = useApi(
    () => classId ? elearningService.getLessons({ class_obj: classId, is_published: true, page_size: 200 }) : Promise.resolve({ results: [] }),
    [classId], !!classId
  );
  const allLessons = lessonsData?.results || lessonsData || [];

  const subjects = useMemo(() => {
    const map = new Map();
    allLessons.forEach(l => { if (l.subject && !map.has(l.subject)) map.set(l.subject, l.subject_name); });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allLessons]);

  useEffect(() => {
    if (!selectedSubject && subjects.length > 0) setSelectedSubject(subjects[0].id);
  }, [subjects, selectedSubject]);

  const { data: pathData, loading: loadPath, refetch: refetchPath } = useApi(
    () => (classId && selectedSubject) ? elearningService.getLearningPath(classId, selectedSubject) : Promise.resolve(null),
    [classId, selectedSubject], !!(classId && selectedSubject)
  );

  useEffect(() => { setPathOverride(null); }, [pathData]);

  const path = pathOverride || pathData;
  const chapters = path?.chapters || [];
  const ungrouped = path?.ungrouped_lessons || [];

  // Compute subject progress
  const subjectProgress = useMemo(() => {
    const allPathLessons = [
      ...chapters.flatMap(c => c.lessons),
      ...ungrouped,
    ];
    const total = allPathLessons.length;
    const done  = allPathLessons.filter(l => l.is_completed).length;
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [chapters, ungrouped]);

  const handleProgressChange = (progress) => {
    if (!path) return;
    const patchLesson = (l) => l.id === progress.lesson ? { ...l, is_completed: progress.is_completed, watch_percent: progress.watch_percent } : l;
    setPathOverride({
      ...path,
      chapters: path.chapters.map(c => ({ ...c, lessons: c.lessons.map(patchLesson) })),
      ungrouped_lessons: path.ungrouped_lessons.map(patchLesson),
    });
    if (progress.is_completed) refetchPath();
  };

  if (loadProfile || loadLessons) return <Spinner />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl flex items-center justify-center" style={{ background: '#fdf2f8' }}>
          <BookOpen className="h-5 w-5" style={{ color: '#db2777' }} />
        </div>
        <div>
          <h1 className="text-lg font-extrabold" style={{ color: '#0f172a' }}>Mon parcours pédagogique</h1>
          <p className="text-xs font-semibold" style={{ color: '#94a3b8' }}>Suivez vos cours dans l'ordre pour progresser</p>
        </div>
      </div>

      {subjects.length === 0 ? (
        <div className="flex flex-col items-center py-20 rounded-2xl" style={{ border: '1.5px dashed #e2e8f0' }}>
          <BookOpen className="h-10 w-10 mb-3 opacity-40" style={{ color: '#db2777' }} />
          <p className="text-sm font-semibold" style={{ color: '#64748b' }}>Aucun cours disponible pour le moment</p>
        </div>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {subjects.map(s => (
              <button key={s.id} onClick={() => setSelectedSubject(s.id)}
                className="px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex-shrink-0"
                style={{
                  background: selectedSubject === s.id ? 'linear-gradient(135deg,#db2777,#be185d)' : '#fff',
                  color: selectedSubject === s.id ? '#fff' : '#64748b',
                  border: '1.5px solid', borderColor: selectedSubject === s.id ? 'transparent' : '#f0f4f9',
                }}>
                {s.name}
              </button>
            ))}
          </div>

          {/* Subject progress bar */}
          {!loadPath && subjectProgress.total > 0 && (
            <div className="rounded-2xl p-4" style={{ background: '#fdf2f8', border: '1.5px solid #fbcfe8' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" style={{ color: '#db2777' }} />
                  <span className="text-sm font-bold" style={{ color: '#db2777' }}>Progression</span>
                </div>
                <span className="text-sm font-black" style={{ color: '#db2777' }}>
                  {subjectProgress.done}/{subjectProgress.total} leçons — {subjectProgress.pct}%
                </span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden" style={{ background: '#fbcfe8' }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${subjectProgress.pct}%`, background: 'linear-gradient(90deg, #db2777, #be185d)' }} />
              </div>
              {subjectProgress.pct === 100 && (
                <div className="flex items-center gap-2 mt-2">
                  <CheckCircle2 className="h-4 w-4" style={{ color: '#059669' }} />
                  <span className="text-xs font-bold" style={{ color: '#059669' }}>Matière complétée ! Félicitations !</span>
                </div>
              )}
            </div>
          )}

          {loadPath ? <Spinner /> : (
            <div className="space-y-3">
              {chapters.map(chapter => <ChapterBlock key={chapter.id} chapter={chapter} onOpenLesson={setOpenLesson} />)}
              {ungrouped.length > 0 && (
                <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid #f0f4f9' }}>
                  <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg,#fafbff,#ffffff)' }}>
                    <p className="text-sm font-extrabold" style={{ color: '#0f172a' }}>Autres leçons</p>
                  </div>
                  <div className="p-3 space-y-2" style={{ borderTop: '1px solid #f0f4f9' }}>
                    {ungrouped.map(lesson => <LessonRow key={lesson.id} lesson={lesson} onOpen={setOpenLesson} />)}
                  </div>
                </div>
              )}
              {chapters.length === 0 && ungrouped.length === 0 && (
                <p className="text-sm text-center py-10" style={{ color: '#94a3b8' }}>Aucun contenu publié pour cette matière.</p>
              )}
            </div>
          )}
        </>
      )}

      {openLesson && (
        <LessonViewerModal lesson={openLesson} onClose={() => setOpenLesson(null)} onProgressChange={handleProgressChange} />
      )}
    </div>
  );
}
