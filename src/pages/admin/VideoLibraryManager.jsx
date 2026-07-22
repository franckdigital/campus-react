import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Play, Upload, Plus, Edit2, Trash2, Eye, Download,
  Film, Clock, Users, ToggleLeft, ToggleRight,
  Subtitles, Shield, Droplets, ChevronDown,
} from 'lucide-react';
import useApi from '../../hooks/useApi';
import elearningService from '../../services/elearning';
import academicService from '../../services/academic';
import { useConfirm } from '../../components/ConfirmDialog';

const SOURCE_LABELS = {
  FILE: 'MP4 uploadé', HLS: 'HLS/m3u8', YOUTUBE: 'YouTube', VIMEO: 'Vimeo', EXTERNAL: 'Lien externe',
};

const EMPTY_FORM = {
  title: '', description: '', source_type: 'FILE',
  video_file: null, source_url: '',
  class_obj: '', subject: '', lesson: '',
  duration_seconds: 0, tags: '',
  is_downloadable: false, token_lifetime_hours: 4,
  watermark_enabled: true, watermark_template: '{student_name} — {matricule}',
  disable_right_click: true, is_published: false, order: 0,
};

function formatDuration(secs) {
  if (!secs) return '—';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}min ${s < 10 ? '0' : ''}${s}s`;
}

function VideoModal({ video, classes, subjects, lessons, onClose, onSaved }) {
  const [form, setForm] = useState(video
    ? { ...EMPTY_FORM, ...video, video_file: null, class_obj: video.class_obj || '', subject: video.subject || '' }
    : { ...EMPTY_FORM });
  const [subtitleFile, setSubtitleFile] = useState(null);
  const [subtitleLang, setSubtitleLang] = useState('fr');
  const [subtitleLabel, setSubtitleLabel] = useState('Français');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.title || !form.class_obj || !form.subject) {
      setError('Titre, classe et matière sont requis.'); return;
    }
    setLoading(true); setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v === null || v === undefined) return;
        if (k === 'video_file' && v) fd.append(k, v);
        else if (k !== 'video_file') fd.append(k, typeof v === 'boolean' ? (v ? 'true' : 'false') : v);
      });
      const res = video
        ? await elearningService.updateVideo(video.id, fd)
        : await elearningService.createVideo(fd);

      if (subtitleFile) {
        const sfd = new FormData();
        sfd.append('file', subtitleFile);
        sfd.append('language_code', subtitleLang);
        sfd.append('language_label', subtitleLabel);
        await elearningService.uploadVideoSubtitle(res.id, sfd);
      }
      onSaved();
    } catch (e) {
      setError(e.message || 'Erreur lors de la sauvegarde.');
    }
    setLoading(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between gap-3 p-4 sm:p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900 truncate min-w-0">
            {video ? 'Modifier la vidéo' : 'Ajouter une vidéo'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none flex-shrink-0">&times;</button>
        </div>

        <div className="p-4 sm:p-6 space-y-5">
          {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}

          {/* Titre & description */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
              <input value={form.title} onChange={e => set('title', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          {/* Source */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type de source</label>
            <select value={form.source_type} onChange={e => set('source_type', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {form.source_type === 'FILE' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fichier MP4</label>
              <input type="file" accept="video/mp4,video/*" ref={fileRef}
                onChange={e => set('video_file', e.target.files[0])}
                className="w-full text-sm text-gray-500" />
              {video?.video_url && (
                <p className="text-xs text-gray-400 mt-1">Fichier actuel : {video.title}</p>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL ({SOURCE_LABELS[form.source_type]})
              </label>
              <input value={form.source_url} onChange={e => set('source_url', e.target.value)}
                placeholder={form.source_type === 'HLS' ? 'https://cdn.../manifest.m3u8' : 'https://...'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          )}

          {/* Classe / matière */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Classe *</label>
              <select value={form.class_obj} onChange={e => set('class_obj', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Sélectionner</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Matière *</label>
              <select value={form.subject} onChange={e => set('subject', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Sélectionner</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {/* Durée / Ordre / Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Durée (secondes)</label>
              <input type="number" min={0} value={form.duration_seconds}
                onChange={e => set('duration_seconds', parseInt(e.target.value) || 0)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ordre</label>
              <input type="number" min={0} value={form.order}
                onChange={e => set('order', parseInt(e.target.value) || 0)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags (virgules)</label>
              <input value={form.tags} onChange={e => set('tags', e.target.value)}
                placeholder="maths, algèbre, ..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          {/* Protection DRM */}
          <div className="border border-orange-200 rounded-xl p-4 space-y-3 bg-orange-50">
            <h3 className="text-sm font-semibold text-orange-800 flex items-center gap-2">
              <Shield size={15} /> Protection & DRM
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                ['is_downloadable', 'Téléchargement autorisé'],
                ['watermark_enabled', 'Filigrane étudiant'],
                ['disable_right_click', 'Bloquer clic droit'],
                ['is_published', 'Publié'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm text-orange-700 cursor-pointer">
                  <input type="checkbox" checked={!!form[key]} onChange={e => set(key, e.target.checked)}
                    className="rounded" />
                  {label}
                </label>
              ))}
            </div>
            {form.watermark_enabled && (
              <div>
                <label className="block text-xs text-orange-700 mb-1">Modèle filigrane</label>
                <input value={form.watermark_template} onChange={e => set('watermark_template', e.target.value)}
                  className="w-full border border-orange-300 rounded-lg px-2 py-1 text-sm bg-white" />
                <p className="text-xs text-orange-500 mt-0.5">Variables : {'{student_name}'}, {'{matricule}'}, {'{date}'}</p>
              </div>
            )}
            {form.is_downloadable && (
              <div>
                <label className="block text-xs text-orange-700 mb-1">Durée du token (heures)</label>
                <input type="number" min={1} max={168} value={form.token_lifetime_hours}
                  onChange={e => set('token_lifetime_hours', parseInt(e.target.value) || 4)}
                  className="w-32 border border-orange-300 rounded-lg px-2 py-1 text-sm bg-white" />
              </div>
            )}
          </div>

          {/* Sous-titres */}
          <div className="border border-purple-200 rounded-xl p-4 space-y-3 bg-purple-50">
            <h3 className="text-sm font-semibold text-purple-800 flex items-center gap-2">
              <Subtitles size={15} /> Ajouter des sous-titres (WebVTT)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-purple-700 mb-1">Code langue</label>
                <input value={subtitleLang} onChange={e => setSubtitleLang(e.target.value)}
                  placeholder="fr" className="w-full border border-purple-300 rounded px-2 py-1 text-sm bg-white" />
              </div>
              <div>
                <label className="block text-xs text-purple-700 mb-1">Label</label>
                <input value={subtitleLabel} onChange={e => setSubtitleLabel(e.target.value)}
                  placeholder="Français" className="w-full border border-purple-300 rounded px-2 py-1 text-sm bg-white" />
              </div>
              <div>
                <label className="block text-xs text-purple-700 mb-1">Fichier .vtt</label>
                <input type="file" accept=".vtt,.srt" onChange={e => setSubtitleFile(e.target.files[0])}
                  className="w-full text-xs" />
              </div>
            </div>
            {video?.subtitles?.length > 0 && (
              <div className="text-xs text-purple-600">
                Sous-titres existants : {video.subtitles.map(s => s.language_label).join(', ')}
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t p-4 sm:p-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            Annuler
          </button>
          <button onClick={save} disabled={loading}
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
            {loading ? 'Sauvegarde...' : video ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function VideoLibraryManager() {
  const [search, setSearch] = useState('');
  const [filterPublished, setFilterPublished] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const confirm = useConfirm();

  const { data: videosData, loading, refetch } = useApi(
    () => elearningService.getVideos(), []
  );
  const { data: classesData } = useApi(() => academicService.getClasses({ page_size: 500 }), []);
  const { data: subjectsData } = useApi(() => academicService.getSubjects({ page_size: 500 }), []);

  const videos = videosData?.results ?? videosData ?? [];
  const classes = classesData?.results ?? classesData ?? [];
  const subjects = subjectsData?.results ?? subjectsData ?? [];

  const filtered = videos.filter(v => {
    const match = !search || v.title.toLowerCase().includes(search.toLowerCase()) || (v.tags || '').toLowerCase().includes(search.toLowerCase());
    const pub = filterPublished === '' || (filterPublished === '1' ? v.is_published : !v.is_published);
    return match && pub;
  });

  const handleDelete = async (video) => {
    if (!await confirm({ title: 'Supprimer la vidéo ?', message: 'Cette action est irréversible.', confirmLabel: 'Supprimer', destructive: true })) return;
    await elearningService.deleteVideo(video.id);
    refetch();
  };

  const providerBadge = (type) => {
    const colors = { FILE: 'bg-blue-100 text-blue-700', HLS: 'bg-green-100 text-green-700', YOUTUBE: 'bg-red-100 text-red-700', VIMEO: 'bg-indigo-100 text-indigo-700', EXTERNAL: 'bg-gray-100 text-gray-700' };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[type] || 'bg-gray-100 text-gray-700'}`}>{SOURCE_LABELS[type] || type}</span>;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-gray-900">Vidéothèque</h2>
          <p className="text-sm text-gray-500">{filtered.length} vidéo{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setEditing(null); setModalOpen(true); }}
          className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 flex-shrink-0">
          <Plus size={16} /> Ajouter une vidéo
        </button>
      </div>

      {/* Filtres */}
      <div className="flex gap-3 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par titre ou tags..."
          className="flex-1 min-w-48 border border-gray-300 rounded-xl px-3 py-2 text-sm" />
        <select value={filterPublished} onChange={e => setFilterPublished(e.target.value)}
          className="border border-gray-300 rounded-xl px-3 py-2 text-sm">
          <option value="">Tous les statuts</option>
          <option value="1">Publiées</option>
          <option value="0">Brouillons</option>
        </select>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Film size={48} className="mx-auto mb-3 opacity-30" />
          <p>Aucune vidéo trouvée</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map(v => (
            <div key={v.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <div className="flex flex-col sm:flex-row gap-4 p-4">
                <div className="flex gap-4 min-w-0 flex-1">
                  {/* Thumbnail */}
                  <div className="w-24 h-16 sm:w-32 sm:h-20 bg-gray-100 rounded-xl flex-shrink-0 overflow-hidden relative">
                    {v.thumbnail_url ? (
                      <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film size={28} className="text-gray-300" />
                      </div>
                    )}
                    {!v.is_published && (
                      <span className="absolute top-1 left-1 bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded">Brouillon</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{v.title}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{v.class_name} · {v.subject_name}</p>
                      </div>
                      {providerBadge(v.source_type)}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Clock size={12} />{formatDuration(v.duration_seconds)}</span>
                      <span className="flex items-center gap-1"><Eye size={12} />{v.view_count} vues</span>
                      {v.subtitles?.length > 0 && (
                        <span className="flex items-center gap-1 text-purple-600">
                          <Subtitles size={12} />{v.subtitles.length} sous-titre{v.subtitles.length > 1 ? 's' : ''}
                        </span>
                      )}
                      {v.watermark_enabled && (
                        <span className="flex items-center gap-1 text-orange-600"><Droplets size={12} />Filigrane</span>
                      )}
                      {v.is_downloadable && (
                        <span className="flex items-center gap-1 text-green-600"><Download size={12} />Téléch. {v.token_lifetime_hours}h</span>
                      )}
                    </div>

                    {v.tags && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {v.tags.split(',').slice(0, 4).map(t => (
                          <span key={t} className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full text-xs">{t.trim()}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-row sm:flex-col gap-1.5 flex-wrap flex-shrink-0">
                  {v.video_url && v.source_type !== 'YOUTUBE' && v.source_type !== 'VIMEO' && (
                    <a href={v.video_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs hover:bg-indigo-100">
                      <Play size={13} /> Aperçu
                    </a>
                  )}
                  <button onClick={() => { setEditing(v); setModalOpen(true); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg text-xs hover:bg-gray-100">
                    <Edit2 size={13} /> Modifier
                  </button>
                  <button onClick={() => handleDelete(v)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs hover:bg-red-100">
                    <Trash2 size={13} /> Supprimer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <VideoModal
          video={editing}
          classes={classes}
          subjects={subjects}
          lessons={[]}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSaved={() => { setModalOpen(false); setEditing(null); refetch(); }}
        />
      )}
    </div>
  );
}
