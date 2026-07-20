import { useState } from 'react';
import {
  FlaskConical, Clock, CheckCircle, ExternalLink, X, Upload,
  AlertCircle, Award, Send, ArrowLeft, Target, ListChecks,
} from 'lucide-react';
import useApi from '../../hooks/useApi';
import elearningService from '../../services/elearning';
import studentsService from '../../services/students';

const LAB_TYPES = {
  INFO: { label: 'Informatique', color: '#0ea5e9' },
  PHYSICS: { label: 'Physique', color: '#7c3aed' },
  CHEMISTRY: { label: 'Chimie', color: '#d97706' },
  NETWORK: { label: 'Réseaux', color: '#059669' },
  CLOUD: { label: 'Cloud', color: '#0284c7' },
  ELECTRONICS: { label: 'Électronique', color: '#dc2626' },
  AI: { label: 'Intelligence Artificielle', color: '#db2777' },
  PROGRAMMING: { label: 'Programmation', color: '#2563eb' },
  DOCKER: { label: 'Docker', color: '#1d4ed8' },
  LINUX: { label: 'Linux', color: '#374151' },
  VM: { label: 'Machines virtuelles', color: '#6366f1' },
  MATH: { label: 'Mathématiques', color: '#8b5cf6' },
  BIO: { label: 'Biologie', color: '#16a34a' },
  OTHER: { label: 'Autre', color: '#64748b' },
};

const STATUS_LABELS = {
  STARTED: { label: 'En cours', color: '#d97706', bg: '#fffbeb' },
  SUBMITTED: { label: 'En correction', color: '#0ea5e9', bg: '#f0f9ff' },
  GRADED: { label: 'Corrigé', color: '#059669', bg: '#f0fdf4' },
};

function LabDetail({ lab, onBack, onChanged }) {
  const lt = LAB_TYPES[lab.lab_type] || LAB_TYPES.OTHER;
  const [reportText, setReportText] = useState('');
  const [reportFile, setReportFile] = useState(null);
  const [screenshot, setScreenshot] = useState(null);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { data: submission, loading, refetch } = useApi(
    () => elearningService.getMyLabSubmission(lab.id), [lab.id], true
  );

  const handleStart = async () => {
    setStarting(true); setError('');
    try {
      await elearningService.startLabSession(lab.id);
      refetch();
    } catch (err) {
      setError(err.message || 'Impossible de démarrer ce laboratoire.');
    } finally { setStarting(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!submission) return;
    setSubmitting(true); setError('');
    try {
      const fd = new FormData();
      fd.append('report_text', reportText);
      if (reportFile) fd.append('report_file', reportFile);
      if (screenshot) fd.append('screenshot', screenshot);
      await elearningService.submitLabWork(submission.id, fd);
      refetch();
      onChanged?.();
    } catch (err) {
      setError(err.message || 'Erreur lors de la soumission.');
    } finally { setSubmitting(false); }
  };

  const st = submission ? STATUS_LABELS[submission.status] : null;

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-800">
        <ArrowLeft size={16} /> Retour aux laboratoires
      </button>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${lt.color}, #10b981)` }} />
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${lt.color}22, ${lt.color}44)` }}>
              <FlaskConical className="h-6 w-6" style={{ color: lt.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-lg font-bold text-gray-900">{lab.title}</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${lt.color}22`, color: lt.color }}>{lt.label}</span>
                {st && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>}
              </div>
              <p className="text-xs text-gray-500">{lab.subject_name} · {lab.class_name}</p>
              <div className="flex items-center gap-4 text-xs text-gray-500 mt-1.5">
                <span className="flex items-center gap-1"><Clock size={12} />{lab.duration_minutes} min</span>
                {lab.due_date && <span>Échéance : {new Date(lab.due_date).toLocaleDateString('fr-FR')}</span>}
                <span>{lab.max_attempts} tentative{lab.max_attempts !== 1 ? 's' : ''} max</span>
              </div>
            </div>
          </div>

          {lab.description && <p className="text-sm text-gray-600 leading-relaxed">{lab.description}</p>}

          {lab.objectives && (
            <div className="rounded-xl p-4 bg-emerald-50 border border-emerald-100">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 flex items-center gap-1.5 mb-1.5">
                <Target size={13} /> Objectifs pédagogiques
              </p>
              <p className="text-sm text-emerald-900 whitespace-pre-wrap">{lab.objectives}</p>
            </div>
          )}

          {lab.instructions && (
            <div className="rounded-xl p-4 bg-indigo-50 border border-indigo-100">
              <p className="text-xs font-bold uppercase tracking-wide text-indigo-700 flex items-center gap-1.5 mb-1.5">
                <ListChecks size={13} /> Instructions
              </p>
              <p className="text-sm text-indigo-900 whitespace-pre-wrap">{lab.instructions}</p>
            </div>
          )}

          {lab.embed_url ? (
            <iframe src={lab.embed_url} title={lab.title} className="w-full rounded-xl border border-gray-200" style={{ height: 480 }} />
          ) : lab.access_url ? (
            <a href={lab.access_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: `linear-gradient(135deg, ${lt.color}, #10b981)` }}>
              <ExternalLink size={16} /> Ouvrir le laboratoire
            </a>
          ) : null}
        </div>
      </div>

      {/* Submission area */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !submission ? (
          <div className="flex flex-col items-center py-6 gap-3">
            <FlaskConical className="h-10 w-10 opacity-20" style={{ color: lt.color }} />
            <p className="text-sm font-semibold text-gray-700">Vous n'avez pas encore commencé ce laboratoire</p>
            <button onClick={handleStart} disabled={starting}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${lt.color}, #10b981)` }}>
              {starting ? 'Démarrage…' : 'Démarrer le laboratoire'}
            </button>
          </div>
        ) : submission.status === 'STARTED' ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="text-sm font-bold text-gray-900">Soumettre votre travail</p>
            <textarea value={reportText} onChange={e => setReportText(e.target.value)} rows={5}
              placeholder="Décrivez votre démarche, vos résultats, vos observations..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Rapport (fichier)</label>
                <input type="file" onChange={e => setReportFile(e.target.files[0] || null)}
                  className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Capture d'écran</label>
                <input type="file" accept="image/*" onChange={e => setScreenshot(e.target.files[0] || null)}
                  className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2" />
              </div>
            </div>
            {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
            <button type="submit" disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${lt.color}, #10b981)` }}>
              <Send size={15} /> {submitting ? 'Envoi…' : 'Soumettre mon travail'}
            </button>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} style={{ color: st.color }} />
              <p className="text-sm font-bold text-gray-900">
                {submission.status === 'SUBMITTED' ? 'Travail soumis, en attente de correction' : 'Travail corrigé'}
              </p>
            </div>
            {submission.report_text && (
              <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-xl p-3">{submission.report_text}</p>
            )}
            {submission.status === 'GRADED' && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                <Award className="h-8 w-8 text-emerald-600" />
                <div>
                  <p className="text-sm font-bold text-emerald-900">Note : {submission.score} / {lab.max_score}</p>
                  {submission.feedback && <p className="text-xs text-emerald-700 mt-0.5">{submission.feedback}</p>}
                </div>
              </div>
            )}
            {submission.status !== 'STARTED' && (
              <button onClick={handleStart} disabled={starting}
                className="text-xs font-semibold disabled:opacity-50" style={{ color: lt.color }}>
                <Upload size={12} className="inline mr-1" />
                {starting ? 'Démarrage…' : 'Démarrer une nouvelle tentative'}
              </button>
            )}
            {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudentVirtualLabs() {
  const [selected, setSelected] = useState(null);

  const { data: profile } = useApi(() => studentsService.getMe(), [], true);
  const classId = profile?.current_class?.id;

  const { data: labsData, loading, refetch } = useApi(
    () => elearningService.getVirtualLabs({ class_obj: classId, is_published: true }),
    [classId], !!classId
  );

  const labs = labsData?.results ?? labsData ?? [];

  if (selected) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <LabDetail lab={selected} onBack={() => { setSelected(null); refetch(); }} onChanged={refetch} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <FlaskConical className="text-emerald-600" size={22} /> Laboratoires virtuels
        </h1>
        <p className="text-sm text-gray-500 mt-1">Travaux pratiques interactifs proposés pour votre classe</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : labs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FlaskConical size={40} className="mx-auto mb-3 opacity-30" />
          <p>Aucun laboratoire disponible pour le moment</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {labs.map(lab => {
            const lt = LAB_TYPES[lab.lab_type] || LAB_TYPES.OTHER;
            const st = lab.my_submission ? STATUS_LABELS[lab.my_submission.status] : null;
            return (
              <div key={lab.id} onClick={() => setSelected(lab)}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden">
                <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${lt.color}, #10b981)` }} />
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${lt.color}22, ${lt.color}44)` }}>
                      <FlaskConical className="h-4.5 w-4.5" style={{ color: lt.color }} />
                    </div>
                    {st && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>}
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm">{lab.title}</h3>
                  <p className="text-xs text-gray-400">{lab.subject_name}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 pt-1">
                    <span className="flex items-center gap-1"><Clock size={11} />{lab.duration_minutes} min</span>
                    <span className="px-1.5 py-0.5 rounded-full" style={{ background: `${lt.color}15`, color: lt.color }}>{lt.label}</span>
                  </div>
                  {lab.my_submission?.score != null && (
                    <p className="text-xs font-semibold text-emerald-600">Note : {lab.my_submission.score} / {lab.max_score}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
