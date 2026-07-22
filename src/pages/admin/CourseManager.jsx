import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Edit, Trash2, BookOpen, ChevronDown, ChevronUp,
  Star, Users, Image as ImageIcon, ArrowLeft, FileText, X, ClipboardList,
} from 'lucide-react';
import { elearningService, academicService } from '../../services';
import { useApi } from '../../hooks/useApi';
import { useNotifications } from '../../components/Notifications';
import { useConfirm } from '../../components/ConfirmDialog';
import { useSite } from '../../contexts/SiteContext';
import AssignmentManager from './AssignmentManager';

const C = '#db2777';
const C_BG = '#fdf2f8';
const C_ICON = '#fce7f3';

const LEVEL_OPTIONS = [
  { value: 'all_levels',   label: 'Tous niveaux',    bg: '#f3e8ff', color: '#7e22ce' },
  { value: 'beginner',     label: 'Débutant',         bg: '#d1fae5', color: '#065f46' },
  { value: 'intermediate', label: 'Intermédiaire',    bg: '#dbeafe', color: '#1d4ed8' },
  { value: 'advanced',     label: 'Avancé',           bg: '#fee2e2', color: '#991b1b' },
];

const STATUS_OPTIONS = [
  { value: 'draft',     label: 'Brouillon', bg: '#fef9c3', color: '#92400e' },
  { value: 'published', label: 'Publié',    bg: '#d1fae5', color: '#065f46' },
  { value: 'archived',  label: 'Archivé',   bg: '#f1f5f9', color: '#64748b' },
];

const CONTENT_TYPES = [
  { value: 'video',   label: 'Vidéo' },
  { value: 'audio',   label: 'Audio' },
  { value: 'pdf',     label: 'PDF' },
  { value: 'ppt',     label: 'PowerPoint' },
  { value: 'word',    label: 'Word' },
  { value: 'image',   label: 'Image' },
  { value: 'text',    label: 'Texte' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'vimeo',   label: 'Vimeo' },
  { value: 'iframe',  label: 'Iframe' },
  { value: 'html5',   label: 'HTML5' },
];

// Types that take an uploaded file rather than a URL or free text, and the
// model field / accept filter each one maps to.
const FILE_FIELD = { video: 'video_file', audio: 'video_file', pdf: 'document_file', ppt: 'document_file', word: 'document_file', image: 'document_file', html5: 'document_file' };
const FILE_ACCEPT = { video: 'video/*', audio: 'audio/*', pdf: '.pdf,application/pdf', ppt: '.ppt,.pptx', word: '.doc,.docx', image: 'image/*', html5: '.html,.htm,.zip' };
const URL_TYPES = ['youtube', 'vimeo', 'iframe'];

// ─── Content input — switches between file upload / URL / text depending on type ──
function ContentTypeInput({ contentType, url, onUrlChange, text, onTextChange, file, onFileChange, existingFileUrl }) {
  if (contentType === 'text') {
    return (
      <Fld label="Contenu texte">
        <textarea value={text} onChange={e => onTextChange(e.target.value)} rows={4}
          className="input-field resize-none" placeholder="Rédigez le contenu de la leçon…" />
      </Fld>
    );
  }
  if (URL_TYPES.includes(contentType)) {
    return (
      <Fld label={contentType === 'youtube' ? 'URL YouTube' : contentType === 'vimeo' ? 'URL Vimeo' : 'URL Iframe'}>
        <input type="url" value={url} onChange={e => onUrlChange(e.target.value)} className="input-field" placeholder="https://…" />
      </Fld>
    );
  }
  const typeLabel = CONTENT_TYPES.find(c => c.value === contentType)?.label || contentType;
  return (
    <Fld label={`Fichier ${typeLabel}`}>
      <input type="file" accept={FILE_ACCEPT[contentType] || '*/*'}
        onChange={e => onFileChange(e.target.files[0] || null)} className="input-field" />
      {file ? (
        <p className="text-xs mt-1 font-semibold" style={{ color: C }}>{file.name}</p>
      ) : existingFileUrl ? (
        <a href={existingFileUrl} target="_blank" rel="noopener noreferrer"
          className="text-xs mt-1 inline-block font-semibold" style={{ color: '#2563eb' }}>Fichier actuel — voir</a>
      ) : null}
    </Fld>
  );
}

// Builds the multipart payload sent to the course-lesson create/update endpoints.
function buildLessonFormData({ chapter, title, content_type, is_preview_free, order, url, text, file }) {
  const fd = new FormData();
  if (chapter !== undefined) fd.append('chapter', chapter);
  fd.append('title', title);
  fd.append('content_type', content_type);
  if (is_preview_free !== undefined) fd.append('is_preview_free', is_preview_free);
  if (order !== undefined) fd.append('order', order);
  if (content_type === 'text') fd.append('text_content', text || '');
  else if (URL_TYPES.includes(content_type)) fd.append('external_embed_url', url || '');
  if (file) fd.append(FILE_FIELD[content_type] || 'document_file', file);
  return fd;
}

// ─── UI helpers ──────────────────────────────────────────────────────────────

const Shell = ({ open, onClose, title, size = 'md', zIndex = 50, children }) => {
  if (!open) return null;
  const w = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-3xl' };
  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4"
      style={{ background: 'rgba(8,12,36,0.62)', backdropFilter: 'blur(12px)', zIndex }}
      onClick={onClose}>
      <div className={`bg-white rounded-2xl w-full ${w[size]} max-h-[90vh] overflow-y-auto`}
        style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.2)' }}
        onClick={e => e.stopPropagation()}>
        <div className="h-1 rounded-t-2xl" style={{ background: `linear-gradient(90deg,${C},#6366f1,#8b5cf6)` }} />
        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-4" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <h2 className="text-base font-extrabold truncate min-w-0" style={{ color: '#0f172a' }}>{title}</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
            style={{ color: '#64748b' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 sm:p-6 space-y-4">{children}</div>
      </div>
    </div>,
    document.body
  );
};

const Fld = ({ label, required, children }) => (
  <div>
    <label className="block mb-1.5"
      style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
    </label>
    {children}
  </div>
);

const Foot = ({ onCancel, loading, label, color = C }) => (
  <div className="flex justify-end gap-3 pt-2" style={{ borderTop: '1px solid #f1f5f9' }}>
    <button type="button" onClick={onCancel}
      className="px-5 py-2.5 rounded-xl text-sm font-semibold border"
      style={{ color: '#64748b', borderColor: '#e2e8f0' }}>Annuler</button>
    <button type="submit" disabled={loading}
      className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
      style={{ background: `linear-gradient(135deg,${color},${color}cc)`, boxShadow: `0 4px 14px ${color}40` }}>
      {loading ? 'Enregistrement…' : label}
    </button>
  </div>
);

const LevelBadge = ({ level }) => {
  const o = LEVEL_OPTIONS.find(l => l.value === level) || LEVEL_OPTIONS[0];
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: o.bg, color: o.color }}>{o.label}</span>;
};
const StatusBadge = ({ status }) => {
  const o = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: o.bg, color: o.color }}>{o.label}</span>;
};

const iconBtn = (onClick, Icon, hover) => (
  <button type="button" onClick={onClick}
    className="h-6 w-6 rounded-lg flex items-center justify-center transition-all flex-shrink-0"
    style={{ color: '#cbd5e1' }}
    onMouseEnter={e => { e.currentTarget.style.background = hover.bg; e.currentTarget.style.color = hover.color; }}
    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#cbd5e1'; }}>
    <Icon className="h-3 w-3" />
  </button>
);

// ─── Lesson Row ───────────────────────────────────────────────────────────────

function LessonRow({ lesson, onRefresh, notify, confirm }) {
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({ title: lesson.title, content_type: lesson.content_type, is_preview_free: lesson.is_preview_free || false, external_embed_url: lesson.external_embed_url || '', text_content: lesson.text_content || '' });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = buildLessonFormData({
        title: form.title, content_type: form.content_type, is_preview_free: form.is_preview_free,
        url: form.external_embed_url, text: form.text_content, file,
      });
      await elearningService.updateCourseLessonWithFile(lesson.id, fd);
      notify({ type: 'success', title: 'Leçon modifiée' });
      setShowEdit(false); setFile(null); onRefresh();
    } catch { notify({ type: 'error', title: 'Erreur', message: 'Erreur lors de la modification' }); }
    finally { setLoading(false); }
  };

  const del = async () => {
    if (!await confirm({ title: `Supprimer "${lesson.title}" ?`, confirmLabel: 'Supprimer', destructive: true })) return;
    try { await elearningService.deleteCourseLesson(lesson.id); notify({ type: 'success', title: 'Leçon supprimée' }); onRefresh(); }
    catch { notify({ type: 'error', title: 'Erreur', message: 'Erreur lors de la suppression' }); }
  };

  return (
    <div className="ml-4 mt-1.5 flex flex-col sm:flex-row sm:items-center gap-2 px-3 py-2 rounded-xl transition-all"
      style={{ border: '1px solid #f0f4f9' }}
      onMouseEnter={e => { e.currentTarget.style.background = '#f8faff'; e.currentTarget.style.borderColor = '#e0e7ff'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#f0f4f9'; }}>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <FileText className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
        <span className="flex-1 min-w-0 text-sm font-medium truncate" style={{ color: '#334155' }}>{lesson.title}</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0" style={{ background: '#f1f5f9', color: '#64748b' }}>
          {CONTENT_TYPES.find(c => c.value === lesson.content_type)?.label || lesson.content_type}
        </span>
        {lesson.is_preview_free && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0" style={{ background: '#d1fae5', color: '#065f46' }}>Aperçu</span>
        )}
      </div>
      <div className="flex items-center gap-0.5 flex-shrink-0 self-end sm:self-auto sm:ml-1">
        {iconBtn(() => { setForm({ title: lesson.title, content_type: lesson.content_type, is_preview_free: lesson.is_preview_free || false, external_embed_url: lesson.external_embed_url || '', text_content: lesson.text_content || '' }); setFile(null); setShowEdit(true); }, Edit, { bg: '#dbeafe', color: '#2563eb' })}
        {iconBtn(del, Trash2, { bg: '#fee2e2', color: '#ef4444' })}
      </div>

      <Shell open={showEdit} onClose={() => setShowEdit(false)} title="Modifier la leçon" size="sm" zIndex={120}>
        <form onSubmit={save} className="space-y-4">
          <Fld label="Titre" required>
            <input type="text" required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="input-field" />
          </Fld>
          <Fld label="Type de contenu">
            <select value={form.content_type} onChange={e => setForm(p => ({ ...p, content_type: e.target.value }))} className="input-field cursor-pointer">
              {CONTENT_TYPES.map(ct => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
            </select>
          </Fld>
          <ContentTypeInput
            contentType={form.content_type}
            url={form.external_embed_url} onUrlChange={v => setForm(p => ({ ...p, external_embed_url: v }))}
            text={form.text_content} onTextChange={v => setForm(p => ({ ...p, text_content: v }))}
            file={file} onFileChange={setFile}
            existingFileUrl={lesson.document_file || lesson.video_file}
          />
          <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer" style={{ color: '#475569' }}>
            <input type="checkbox" checked={form.is_preview_free} onChange={e => setForm(p => ({ ...p, is_preview_free: e.target.checked }))} className="h-4 w-4 rounded" />
            Accessible en aperçu gratuit
          </label>
          <Foot onCancel={() => setShowEdit(false)} loading={loading} label="Enregistrer" />
        </form>
      </Shell>
    </div>
  );
}

// ─── Chapter Block ────────────────────────────────────────────────────────────

function ChapterBlock({ chapter, onRefresh, notify, confirm }) {
  const [expanded, setExpanded] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [editTitle, setEditTitle] = useState(chapter.title);
  const [newLesson, setNewLesson] = useState({ title: '', content_type: 'video', external_embed_url: '', text_content: '' });
  const [newLessonFile, setNewLessonFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lessonLoading, setLessonLoading] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await elearningService.updateCourseChapter(chapter.id, { title: editTitle });
      notify({ type: 'success', title: 'Chapitre modifié' });
      setShowEdit(false); onRefresh();
    } catch { notify({ type: 'error', title: 'Erreur', message: 'Erreur lors de la modification' }); }
    finally { setLoading(false); }
  };

  const del = async () => {
    if (!await confirm({ title: `Supprimer "${chapter.title}" ?`, message: 'Toutes les leçons seront supprimées.', confirmLabel: 'Supprimer', destructive: true })) return;
    try { await elearningService.deleteCourseChapter(chapter.id); notify({ type: 'success', title: 'Chapitre supprimé' }); onRefresh(); }
    catch { notify({ type: 'error', title: 'Erreur', message: 'Erreur lors de la suppression' }); }
  };

  const resetNewLesson = () => { setNewLesson({ title: '', content_type: 'video', external_embed_url: '', text_content: '' }); setNewLessonFile(null); };

  const addLesson = async (e) => {
    e.preventDefault();
    if (!newLesson.title.trim()) {
      notify({ type: 'error', title: 'Titre requis', message: 'Donnez un titre à la leçon avant de valider.' });
      return;
    }
    setLessonLoading(true);
    try {
      const fd = buildLessonFormData({
        chapter: chapter.id, title: newLesson.title, content_type: newLesson.content_type,
        url: newLesson.external_embed_url, text: newLesson.text_content, file: newLessonFile,
        order: (chapter.lessons || []).length,
      });
      await elearningService.createCourseLessonWithFile(fd);
      notify({ type: 'success', title: 'Leçon créée' });
      setShowAddLesson(false); resetNewLesson(); onRefresh();
    } catch { notify({ type: 'error', title: 'Erreur', message: 'Erreur lors de la création' }); }
    finally { setLessonLoading(false); }
  };

  return (
    <div className="ml-4 mt-2 rounded-xl overflow-hidden" style={{ border: '1px solid #e8edf5' }}>
      <div className="flex items-center gap-2 px-3 py-2.5" style={{ background: '#f8f9ff' }}>
        <button type="button" onClick={() => setExpanded(v => !v)} className="flex-1 min-w-0 flex items-center gap-2 text-left">
          {expanded
            ? <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
            : <ChevronUp className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />}
          <span className="text-sm font-bold truncate min-w-0" style={{ color: '#1e293b' }}>{chapter.title}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0" style={{ background: '#ede9fe', color: '#7c3aed' }}>
            {(chapter.lessons || []).length} leçon{(chapter.lessons || []).length !== 1 ? 's' : ''}
          </span>
        </button>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {iconBtn(() => { setEditTitle(chapter.title); setShowEdit(true); }, Edit, { bg: '#dbeafe', color: '#2563eb' })}
          {iconBtn(del, Trash2, { bg: '#fee2e2', color: '#ef4444' })}
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-1">
          {(chapter.lessons || []).map(lesson => (
            <LessonRow key={lesson.id} lesson={lesson} onRefresh={onRefresh} notify={notify} confirm={confirm} />
          ))}
          <button type="button" onClick={() => setShowAddLesson(v => !v)}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
            style={{ color: C, background: C_BG }}>
            <Plus className="h-3.5 w-3.5" /> Ajouter une leçon
          </button>
          {showAddLesson && (
            <form onSubmit={addLesson} className="mt-2 space-y-2">
              <div className="flex gap-2 flex-wrap">
                <input type="text" value={newLesson.title} onChange={e => setNewLesson(p => ({ ...p, title: e.target.value }))}
                  placeholder="Titre de la leçon…" className="input-field flex-1 text-sm" style={{ minWidth: 160 }} />
                <select value={newLesson.content_type}
                  onChange={e => { setNewLesson(p => ({ ...p, content_type: e.target.value, external_embed_url: '', text_content: '' })); setNewLessonFile(null); }}
                  className="input-field text-sm cursor-pointer" style={{ width: 120 }}>
                  {CONTENT_TYPES.map(ct => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
                </select>
                <button type="submit" disabled={lessonLoading} className="px-3 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: C }}>
                  {lessonLoading ? '…' : 'OK'}
                </button>
                <button type="button" onClick={() => { setShowAddLesson(false); resetNewLesson(); }}
                  className="px-3 py-2 rounded-xl text-sm font-semibold" style={{ color: '#64748b' }}>✕</button>
              </div>
              <ContentTypeInput
                contentType={newLesson.content_type}
                url={newLesson.external_embed_url} onUrlChange={v => setNewLesson(p => ({ ...p, external_embed_url: v }))}
                text={newLesson.text_content} onTextChange={v => setNewLesson(p => ({ ...p, text_content: v }))}
                file={newLessonFile} onFileChange={setNewLessonFile}
              />
            </form>
          )}
        </div>
      )}

      <Shell open={showEdit} onClose={() => setShowEdit(false)} title="Modifier le chapitre" size="sm" zIndex={110}>
        <form onSubmit={save} className="space-y-4">
          <Fld label="Titre" required>
            <input type="text" required value={editTitle} onChange={e => setEditTitle(e.target.value)} className="input-field" />
          </Fld>
          <Foot onCancel={() => setShowEdit(false)} loading={loading} label="Enregistrer" />
        </form>
      </Shell>
    </div>
  );
}

// ─── Section Block ────────────────────────────────────────────────────────────

function SectionBlock({ section, onRefresh, notify, confirm }) {
  const [expanded, setExpanded] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [editTitle, setEditTitle] = useState(section.title);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [chLoading, setChLoading] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await elearningService.updateCourseSection(section.id, { title: editTitle });
      notify({ type: 'success', title: 'Section modifiée' });
      setShowEdit(false); onRefresh();
    } catch { notify({ type: 'error', title: 'Erreur', message: 'Erreur lors de la modification' }); }
    finally { setLoading(false); }
  };

  const del = async () => {
    if (!await confirm({ title: `Supprimer la section "${section.title}" ?`, message: 'Tous les chapitres et leçons seront supprimés.', confirmLabel: 'Supprimer', destructive: true })) return;
    try { await elearningService.deleteCourseSection(section.id); notify({ type: 'success', title: 'Section supprimée' }); onRefresh(); }
    catch { notify({ type: 'error', title: 'Erreur', message: 'Erreur lors de la suppression' }); }
  };

  const addChapter = async (e) => {
    e.preventDefault();
    if (!newChapterTitle.trim()) return;
    setChLoading(true);
    try {
      await elearningService.createCourseChapter({ section: section.id, title: newChapterTitle, order: (section.chapters || []).length });
      notify({ type: 'success', title: 'Chapitre créé' });
      setShowAddChapter(false); setNewChapterTitle(''); onRefresh();
    } catch { notify({ type: 'error', title: 'Erreur', message: 'Erreur lors de la création' }); }
    finally { setChLoading(false); }
  };

  return (
    <div className="rounded-xl mb-3 overflow-hidden" style={{ border: '1.5px solid #e2e8f0' }}>
      <div className="flex items-center gap-2 px-4 py-3" style={{ background: '#f8faff' }}>
        <button type="button" onClick={() => setExpanded(v => !v)} className="flex-1 min-w-0 flex items-center gap-2 text-left">
          {expanded
            ? <ChevronDown className="h-4 w-4 flex-shrink-0 text-slate-400" />
            : <ChevronUp className="h-4 w-4 flex-shrink-0 text-slate-400" />}
          <BookOpen className="h-4 w-4 flex-shrink-0" style={{ color: C }} />
          <span className="text-sm font-extrabold truncate min-w-0" style={{ color: '#0f172a' }}>{section.title}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0" style={{ background: C_BG, color: C }}>
            {(section.chapters || []).length} ch.
          </span>
        </button>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button type="button" onClick={() => { setEditTitle(section.title); setShowEdit(true); }}
            className="h-7 w-7 rounded-lg flex items-center justify-center transition-all" style={{ color: '#94a3b8' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#dbeafe'; e.currentTarget.style.color = '#2563eb'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}>
            <Edit className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={del}
            className="h-7 w-7 rounded-lg flex items-center justify-center transition-all" style={{ color: '#94a3b8' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-1">
          {(section.chapters || []).map(chapter => (
            <ChapterBlock key={chapter.id} chapter={chapter} onRefresh={onRefresh} notify={notify} confirm={confirm} />
          ))}
          <button type="button" onClick={() => setShowAddChapter(v => !v)}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all"
            style={{ color: '#7c3aed', background: '#f5f3ff' }}>
            <Plus className="h-3.5 w-3.5" /> Ajouter un chapitre
          </button>
          {showAddChapter && (
            <form onSubmit={addChapter} className="mt-2 flex gap-2">
              <input type="text" value={newChapterTitle} onChange={e => setNewChapterTitle(e.target.value)}
                placeholder="Titre du chapitre…" className="input-field flex-1 text-sm" />
              <button type="submit" disabled={chLoading} className="px-3 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: '#7c3aed' }}>
                {chLoading ? '…' : 'OK'}
              </button>
              <button type="button" onClick={() => { setShowAddChapter(false); setNewChapterTitle(''); }}
                className="px-3 py-2 rounded-xl text-sm font-semibold" style={{ color: '#64748b' }}>✕</button>
            </form>
          )}
        </div>
      )}

      <Shell open={showEdit} onClose={() => setShowEdit(false)} title="Modifier la section" size="sm" zIndex={100}>
        <form onSubmit={save} className="space-y-4">
          <Fld label="Titre" required>
            <input type="text" required value={editTitle} onChange={e => setEditTitle(e.target.value)} className="input-field" />
          </Fld>
          <Foot onCancel={() => setShowEdit(false)} loading={loading} label="Enregistrer" />
        </form>
      </Shell>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CourseManager({ initialCourse, onCourseOpened, onSaved, classesList: classesListProp, subjectsList: subjectsListProp }) {
  const { selectedSite } = useSite();
  const { notify } = useNotifications();
  const confirm = useConfirm();

  // The embedded "Devoirs" tab below needs class/subject options for its
  // Assignment form. Callers that already have a scoped list (e.g. the
  // teacher-facing wrapper, via useTeacherClassSubjects()) can pass it in;
  // otherwise fetch the full admin-wide lists here.
  const { data: allClassesData } = useApi(
    () => academicService.getClasses({ page_size: 500 }), [], classesListProp === undefined
  );
  const { data: allSubjectsData } = useApi(
    () => academicService.getSubjects({ page_size: 500 }), [], subjectsListProp === undefined
  );
  const classesList  = classesListProp  !== undefined ? classesListProp  : (allClassesData?.results  || allClassesData  || []);
  const subjectsList = subjectsListProp !== undefined ? subjectsListProp : (allSubjectsData?.results || allSubjectsData || []);

  const [activeCourse, setActiveCourse] = useState(null);
  const [activeTab, setActiveTab] = useState('info');

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', subtitle: '', level: 'all_levels' });
  const [createLoading, setCreateLoading] = useState(false);

  const [infoForm, setInfoForm] = useState({});
  const [infoLoading, setInfoLoading] = useState(false);
  const [thumbFile, setThumbFile] = useState(null);
  const [thumbPreview, setThumbPreview] = useState(null);

  const [courseDetail, setCourseDetail] = useState(null);
  const [courseDetailLoading, setCourseDetailLoading] = useState(false);

  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [sectionLoading, setSectionLoading] = useState(false);

  // Not filtered by selectedSite: that's a sticky, app-wide selection left over
  // from other pages (Students, Finance...) with no selector visible here, so
  // silently hiding courses because of it is confusing. The course catalog
  // view shows all courses regardless of site too — this list should match.
  const { data: coursesData, loading: coursesLoading, refetch: refetchCourses } = useApi(
    () => elearningService.getCourses({ page_size: 200 }), [], true
  );
  const courses = coursesData?.results || coursesData || [];

  const loadDetail = useCallback(async (id) => {
    setCourseDetailLoading(true);
    try {
      const res = await elearningService.getCourseById(id);
      setCourseDetail(res.data || res);
    } catch { notify({ type: 'error', title: 'Erreur', message: 'Impossible de charger le contenu du cours' }); }
    finally { setCourseDetailLoading(false); }
  }, [notify]);

  const handleManage = (course) => {
    setActiveCourse(course);
    setActiveTab('info');
    setInfoForm({
      title: course.title || '',
      subtitle: course.subtitle || '',
      description: course.description || '',
      level: course.level || 'all_levels',
      language: course.language || 'fr',
      status: course.status || 'draft',
      price: course.price || '',
      is_free: course.is_free ?? true,
      certificate_enabled: course.certificate_enabled ?? false,
      target_audience: course.target_audience || '',
      video_url: course.video_url || '',
    });
    setThumbFile(null);
    setThumbPreview(course.thumbnail_url || null);
    loadDetail(course.id);
  };

  useEffect(() => {
    if (!initialCourse) return;
    try {
      handleManage(initialCourse);
      onCourseOpened?.();
    } catch (e) {
      console.error('[CourseManager] Error opening initial course:', e);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      const res = await elearningService.createCourse({
        ...createForm,
        ...(selectedSite !== 'all' ? { site: selectedSite } : {}),
        is_free: true, status: 'draft',
      });
      const course = res.data || res;
      notify({ type: 'success', title: 'Cours créé', message: 'Le cours a été créé avec succès' });
      setShowCreate(false);
      setCreateForm({ title: '', subtitle: '', level: 'all_levels' });
      refetchCourses();
      if (onSaved) onSaved(course); else handleManage(course);
    } catch (err) {
      notify({ type: 'error', title: 'Erreur', message: err.message || 'Erreur lors de la création' });
    } finally { setCreateLoading(false); }
  };

  const handleDelete = async (course) => {
    if (!await confirm({ title: `Supprimer "${course.title}" ?`, message: 'Cette action est irréversible.', confirmLabel: 'Supprimer', destructive: true })) return;
    try { await elearningService.deleteCourse(course.id); notify({ type: 'success', title: 'Cours supprimé' }); refetchCourses(); }
    catch { notify({ type: 'error', title: 'Erreur', message: 'Erreur lors de la suppression' }); }
  };

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    setInfoLoading(true);
    try {
      let saved;
      if (thumbFile) {
        const fd = new FormData();
        Object.entries(infoForm).forEach(([k, v]) => { if (v != null) fd.append(k, v); });
        fd.append('thumbnail', thumbFile);
        saved = await elearningService.updateCourseWithFile(activeCourse.id, fd);
      } else {
        saved = await elearningService.updateCourse(activeCourse.id, infoForm);
      }
      notify({ type: 'success', title: 'Cours mis à jour' });
      refetchCourses();
      if (onSaved) onSaved(saved?.data || saved || activeCourse);
    } catch (err) {
      notify({ type: 'error', title: 'Erreur', message: err.message || 'Erreur lors de la mise à jour' });
    } finally { setInfoLoading(false); }
  };

  const handleAddSection = async (e) => {
    e.preventDefault();
    if (!newSectionTitle.trim()) return;
    setSectionLoading(true);
    try {
      await elearningService.createCourseSection({ course: activeCourse.id, title: newSectionTitle, order: (courseDetail?.sections || []).length });
      notify({ type: 'success', title: 'Section créée' });
      setShowAddSection(false); setNewSectionTitle('');
      loadDetail(activeCourse.id);
    } catch { notify({ type: 'error', title: 'Erreur', message: 'Erreur lors de la création de la section' }); }
    finally { setSectionLoading(false); }
  };

  const refreshTree = useCallback(() => {
    if (activeCourse) loadDetail(activeCourse.id);
  }, [activeCourse, loadDetail]);

  // ── Editor view ──────────────────────────────────────────────────────────────
  if (activeCourse) {
    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <button type="button" onClick={() => { setActiveCourse(null); setCourseDetail(null); }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ color: '#64748b', background: '#f1f5f9' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; }}>
            <ArrowLeft className="h-4 w-4" /> Retour
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-extrabold truncate" style={{ color: '#0f172a' }}>{activeCourse.title}</h2>
              <LevelBadge level={activeCourse.level} />
              <StatusBadge status={activeCourse.status} />
            </div>
            <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>Édition du cours</p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 rounded-xl overflow-x-auto" style={{ background: '#f1f5f9', width: 'fit-content', maxWidth: '100%' }}>
          {[{ id: 'info', label: 'Informations' }, { id: 'content', label: 'Contenu du cours' }, { id: 'devoirs', label: 'Devoirs & Exercices' }].map(t => (
            <button key={t.id} type="button" onClick={() => setActiveTab(t.id)}
              className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0"
              style={{
                background: activeTab === t.id ? '#fff' : 'transparent',
                color: activeTab === t.id ? C : '#64748b',
                boxShadow: activeTab === t.id ? `0 2px 8px ${C}22` : 'none',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Info tab ────────────────────────────────────────── */}
        {activeTab === 'info' && (
          <form onSubmit={handleSaveInfo} className="space-y-5">
            {/* Thumbnail + title */}
            <div className="flex gap-6 items-start flex-wrap">
              <div className="flex-shrink-0">
                <div className="h-32 w-56 rounded-2xl overflow-hidden flex items-center justify-center"
                  style={{ background: thumbPreview ? 'transparent' : '#f1f5f9', border: '1.5px dashed #e2e8f0' }}>
                  {thumbPreview
                    ? <img src={thumbPreview} alt="Miniature" className="h-full w-full object-cover" />
                    : <ImageIcon className="h-8 w-8 text-slate-300" />}
                </div>
                <label className="mt-2 inline-flex items-center gap-1.5 cursor-pointer text-xs font-semibold transition-all"
                  style={{ color: C }}>
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => {
                      const f = e.target.files[0];
                      if (f) { setThumbFile(f); setThumbPreview(URL.createObjectURL(f)); }
                    }} />
                  <ImageIcon className="h-3.5 w-3.5" /> Changer la miniature
                </label>
              </div>
              <div className="flex-1 space-y-4" style={{ minWidth: 220 }}>
                <Fld label="Titre" required>
                  <input type="text" required value={infoForm.title || ''} onChange={e => setInfoForm(p => ({ ...p, title: e.target.value }))} className="input-field" />
                </Fld>
                <Fld label="Sous-titre">
                  <input type="text" value={infoForm.subtitle || ''} onChange={e => setInfoForm(p => ({ ...p, subtitle: e.target.value }))} className="input-field" />
                </Fld>
              </div>
            </div>

            <Fld label="Description">
              <textarea value={infoForm.description || ''} onChange={e => setInfoForm(p => ({ ...p, description: e.target.value }))} rows={4} className="input-field resize-none" />
            </Fld>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Fld label="Niveau">
                <select value={infoForm.level || 'all_levels'} onChange={e => setInfoForm(p => ({ ...p, level: e.target.value }))} className="input-field cursor-pointer">
                  {LEVEL_OPTIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </Fld>
              <Fld label="Statut">
                <select value={infoForm.status || 'draft'} onChange={e => setInfoForm(p => ({ ...p, status: e.target.value }))} className="input-field cursor-pointer">
                  {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </Fld>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Fld label="Langue">
                <input type="text" value={infoForm.language || 'fr'} onChange={e => setInfoForm(p => ({ ...p, language: e.target.value }))} className="input-field" placeholder="fr, en, ar…" />
              </Fld>
              <Fld label="Prix (FCFA)">
                <input type="number" min="0" value={infoForm.price || ''} onChange={e => setInfoForm(p => ({ ...p, price: e.target.value }))} className="input-field" placeholder="0" />
              </Fld>
            </div>

            <div className="flex gap-6 flex-wrap">
              <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer" style={{ color: '#475569' }}>
                <input type="checkbox" checked={!!infoForm.is_free} onChange={e => setInfoForm(p => ({ ...p, is_free: e.target.checked }))} className="h-4 w-4 rounded" />
                Cours gratuit
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer" style={{ color: '#475569' }}>
                <input type="checkbox" checked={!!infoForm.certificate_enabled} onChange={e => setInfoForm(p => ({ ...p, certificate_enabled: e.target.checked }))} className="h-4 w-4 rounded" />
                Certificat à l'issue du cours
              </label>
            </div>

            <Fld label="Public cible">
              <textarea value={infoForm.target_audience || ''} onChange={e => setInfoForm(p => ({ ...p, target_audience: e.target.value }))} rows={2} className="input-field resize-none" placeholder="À qui s'adresse ce cours ?" />
            </Fld>

            <Fld label="URL vidéo de présentation (YouTube, Vimeo…)">
              <input type="url" value={infoForm.video_url || ''} onChange={e => setInfoForm(p => ({ ...p, video_url: e.target.value }))} className="input-field" placeholder="https://www.youtube.com/watch?v=..." />
            </Fld>

            <div className="flex justify-end pt-2">
              <button type="submit" disabled={infoLoading} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all"
                style={{ background: `linear-gradient(135deg,${C},#e11d48)`, boxShadow: `0 4px 14px ${C}40` }}
                onMouseEnter={e => { if (!infoLoading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 6px 20px ${C}55`; } }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 4px 14px ${C}40`; }}>
                {infoLoading ? 'Enregistrement…' : 'Enregistrer les informations'}
              </button>
            </div>
          </form>
        )}

        {/* ── Devoirs tab ──────────────────────────────────────── */}
        {activeTab === 'devoirs' && (
          <AssignmentManager
            classesList={classesList}
            subjectsList={subjectsList}
            selectedClass=""
            courseFilter={activeCourse.id}
            notify={notify}
          />
        )}

        {/* ── Content tab ──────────────────────────────────────── */}
        {activeTab === 'content' && (
          <div className="space-y-4">
            {courseDetailLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: `${C} transparent transparent transparent` }} />
              </div>
            ) : (
              <>
                {(!courseDetail?.sections || courseDetail.sections.length === 0) && (
                  <div className="flex flex-col items-center py-12 rounded-2xl" style={{ border: '1.5px dashed #e2e8f0' }}>
                    <BookOpen className="h-10 w-10 mb-3 opacity-20" style={{ color: C }} />
                    <p className="text-sm font-semibold" style={{ color: '#64748b' }}>Aucune section pour l'instant</p>
                    <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>Ajoutez des sections pour structurer votre cours</p>
                  </div>
                )}
                {(courseDetail?.sections || []).map(section => (
                  <SectionBlock key={section.id} section={section} onRefresh={refreshTree} notify={notify} confirm={confirm} />
                ))}
                <div className="pt-1">
                  <button type="button" onClick={() => setShowAddSection(v => !v)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                    style={{ background: `linear-gradient(135deg,${C},#e11d48)`, boxShadow: `0 4px 14px ${C}40` }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}>
                    <Plus className="h-4 w-4" /> Ajouter une section
                  </button>
                  {showAddSection && (
                    <form onSubmit={handleAddSection} className="mt-3 flex gap-2">
                      <input type="text" value={newSectionTitle} onChange={e => setNewSectionTitle(e.target.value)}
                        placeholder="Titre de la section…" className="input-field flex-1 text-sm" />
                      <button type="submit" disabled={sectionLoading}
                        className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: C }}>
                        {sectionLoading ? '…' : 'Créer'}
                      </button>
                      <button type="button" onClick={() => { setShowAddSection(false); setNewSectionTitle(''); }}
                        className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ color: '#64748b' }}>Annuler</button>
                    </form>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── List view ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-extrabold" style={{ color: '#0f172a' }}>Cours autonomes</h2>
          <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>Gérez vos formations en ligne structurées</p>
        </div>
        <button type="button" onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: `linear-gradient(135deg,${C},#e11d48)`, boxShadow: `0 4px 14px ${C}40` }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}>
          <Plus className="h-4 w-4" /> Nouveau cours
        </button>
      </div>

      {coursesLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin" />
        </div>
      ) : courses.length === 0 ? (
        <div className="flex flex-col items-center py-16 rounded-2xl" style={{ border: '1.5px dashed #e2e8f0' }}>
          <BookOpen className="h-12 w-12 mb-3 opacity-20" style={{ color: C }} />
          <p className="text-sm font-semibold mb-1" style={{ color: '#1e293b' }}>Aucun cours disponible</p>
          <p className="text-xs mb-4" style={{ color: '#94a3b8' }}>Créez votre premier cours en ligne</p>
          <button type="button" onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: `linear-gradient(135deg,${C},#e11d48)`, boxShadow: `0 4px 14px ${C}40` }}>
            <Plus className="h-4 w-4" /> Créer un cours
          </button>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid #f0f4f9' }}>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'linear-gradient(135deg,#fafbff,#f8f9ff)', borderBottom: '1.5px solid #f0f4f9' }}>
                {['Cours', 'Niveau', 'Statut', 'Prix', 'Étudiants', 'Actions'].map(h => (
                  <th key={h} className={`px-4 py-3.5 text-xs font-extrabold uppercase tracking-wide ${h === 'Actions' ? 'text-right' : 'text-left'}`}
                    style={{ color: '#94a3b8' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {courses.map(course => (
                <tr key={course.id} className="border-t transition-all" style={{ borderColor: '#f0f4f9' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f8faff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-20 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
                        style={{ background: course.thumbnail_url ? 'transparent' : '#f1f5f9', border: '1px solid #f0f4f9' }}>
                        {course.thumbnail_url
                          ? <img src={course.thumbnail_url} alt={course.title} className="h-full w-full object-cover" />
                          : <BookOpen className="h-5 w-5 text-slate-300" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-extrabold text-sm truncate" style={{ color: '#0f172a' }}>{course.title}</p>
                        {course.subtitle && (
                          <p className="text-xs mt-0.5 font-medium line-clamp-1" style={{ color: '#94a3b8' }}>{course.subtitle}</p>
                        )}
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="h-3 w-3" style={{ color: '#f59e0b', fill: '#f59e0b' }} />
                          <span className="text-xs font-bold" style={{ color: '#64748b' }}>
                            {parseFloat(course.average_rating || 0).toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4"><LevelBadge level={course.level} /></td>
                  <td className="px-4 py-4"><StatusBadge status={course.status} /></td>
                  <td className="px-4 py-4">
                    {course.is_free
                      ? <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#d1fae5', color: '#065f46' }}>Gratuit</span>
                      : <span className="text-sm font-extrabold" style={{ color: '#0f172a' }}>{parseFloat(course.price || 0).toLocaleString()} FCFA</span>}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5 text-sm font-bold" style={{ color: '#64748b' }}>
                      <Users className="h-3.5 w-3.5" /> {course.total_students || 0}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button type="button" onClick={() => handleManage(course)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white transition-all"
                        style={{ background: `linear-gradient(135deg,${C},#e11d48)`, boxShadow: `0 3px 10px ${C}35` }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}>
                        <Edit className="h-3.5 w-3.5" /> Gérer
                      </button>
                      <button type="button" onClick={() => handleDelete(course)}
                        className="h-8 w-8 rounded-xl flex items-center justify-center transition-all" style={{ color: '#94a3b8' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Create modal */}
      <Shell open={showCreate} onClose={() => { setShowCreate(false); setCreateForm({ title: '', subtitle: '', level: 'all_levels' }); }}
        title="Nouveau cours" size="sm">
        <form onSubmit={handleCreate} className="space-y-4">
          <Fld label="Titre du cours" required>
            <input type="text" required value={createForm.title} onChange={e => setCreateForm(p => ({ ...p, title: e.target.value }))}
              className="input-field" placeholder="Ex: Introduction à Django" />
          </Fld>
          <Fld label="Sous-titre">
            <input type="text" value={createForm.subtitle} onChange={e => setCreateForm(p => ({ ...p, subtitle: e.target.value }))}
              className="input-field" placeholder="Ex: Apprenez à créer des APIs REST" />
          </Fld>
          <Fld label="Niveau">
            <select value={createForm.level} onChange={e => setCreateForm(p => ({ ...p, level: e.target.value }))} className="input-field cursor-pointer">
              {LEVEL_OPTIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </Fld>
          <Foot onCancel={() => setShowCreate(false)} loading={createLoading} label="Créer le cours" />
        </form>
      </Shell>
    </div>
  );
}
