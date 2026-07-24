import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Edit, Trash2, Shield, CheckCircle, Users, Clock, X, AlertTriangle,
  RefreshCw, ChevronDown, FileText, Type, ToggleLeft, Upload, Database,
  Save, ChevronLeft, ChevronRight, Info, Lock, Check, Minus,
  BookOpen, Settings, Play, Eye, GripVertical, CheckSquare, Calendar,
} from 'lucide-react';
import { elearningService } from '../../services';
import { useApi } from '../../hooks/useApi';
import { IconBtn, Pagination } from '../../components/ui/PageHeader';
import { useConfirm } from '../../components/ConfirmDialog';
import PdfModal from '../../components/exam/PdfModal';
import { useSite } from '../../contexts/SiteContext';

/* ── tokens ──────────────────────────────────────────────────────────────── */
const C = '#ef4444';
const ITEMS = 8;

const EXAM_TYPES = [
  { value: 'MID',     label: 'Partiel' },
  { value: 'FINAL',   label: 'Examen final' },
  { value: 'SUPP',    label: 'Rattrapage' },
  { value: 'TP',      label: 'TP noté' },
  { value: 'CONCOURS',label: 'Concours' },
];
const TYPE_COLORS = { MID: '#d97706', FINAL: '#ef4444', SUPP: '#7c3aed', TP: '#059669', CONCOURS: '#0ea5e9' };

const QTYPES = {
  QCU:       { label: 'QCM (1 réponse)',     color: '#6366f1', bg: '#eef2ff', abbr: 'QCM' },
  QCM:       { label: 'QCM (multi-réponses)',color: '#0ea5e9', bg: '#f0f9ff', abbr: 'QCD' },
  TRUEFALSE: { label: 'Vrai / Faux',         color: '#059669', bg: '#f0fdf4', abbr: 'V/F' },
  TEXT:      { label: 'Réponse texte',       color: '#d97706', bg: '#fffbeb', abbr: 'TXT' },
  PDF:       { label: 'Épreuve PDF',         color: '#7c3aed', bg: '#f5f3ff', abbr: 'PDF' },
};

/* ── shared ──────────────────────────────────────────────────────────────── */
function QBadge({ type }) {
  const m = QTYPES[type] || QTYPES.QCU;
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-black"
          style={{ color: m.color, background: m.bg }}>{m.abbr}</span>
  );
}

function Lbl({ children }) {
  return (
    <label className="block mb-1 text-[10px] font-black uppercase tracking-widest"
           style={{ color: '#64748b' }}>{children}</label>
  );
}

function Input({ ...props }) {
  return (
    <input {...props}
           className="w-full px-3 py-2 rounded-xl text-sm border outline-none transition-all focus:ring-2"
           style={{ borderColor: '#e2e8f0', background: '#f8fafc' }}
           onFocus={e => e.target.style.borderColor = C}
           onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
  );
}

/* ── CLASS PICKER (searchable, single or multi-select) ────────────────────── */
function ClassPicker({ classesList = [], value = [], onChange, multiple = false }) {
  const [query, setQuery] = useState('');
  const [openList, setOpenList] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDocClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpenList(false); }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const filtered = classesList.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));
  const selectedClasses = classesList.filter(c => value.includes(c.id));

  function toggle(id) {
    if (multiple) {
      onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id]);
    } else {
      onChange([id]);
      setOpenList(false);
      setQuery('');
    }
  }

  return (
    <div className="relative" ref={ref}>
      {multiple && selectedClasses.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedClasses.map(c => (
            <span key={c.id} className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg"
                  style={{ background: '#fee2e2', color: C }}>
              {c.name}
              <button type="button" onClick={() => onChange(value.filter(v => v !== c.id))}
                      className="hover:opacity-70" aria-label={`Retirer ${c.name}`}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        value={openList ? query : (multiple ? '' : (selectedClasses[0]?.name || ''))}
        onChange={e => { setQuery(e.target.value); setOpenList(true); }}
        onFocus={() => { setOpenList(true); setQuery(''); }}
        placeholder={multiple ? 'Rechercher une ou plusieurs classes…' : 'Rechercher une classe…'}
        className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
        style={{ borderColor: '#e2e8f0', background: '#f8fafc' }}
      />
      {openList && (
        <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border bg-white shadow-lg"
             style={{ borderColor: '#e2e8f0' }}>
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs" style={{ color: '#94a3b8' }}>Aucune classe trouvée</p>
          ) : filtered.map(c => {
            const isSel = value.includes(c.id);
            return (
              <button type="button" key={c.id} onClick={() => toggle(c.id)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-slate-50"
                      style={{ color: '#1e293b' }}>
                {c.name}
                {isSel && <Check className="h-3.5 w-3.5" style={{ color: C }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── QUESTION COUNTERS ───────────────────────────────────────────────────── */
function QuestionCounters({ questions }) {
  const counts = {};
  questions.forEach(q => { counts[q.question_type] = (counts[q.question_type] || 0) + 1; });
  const totalPts  = questions.reduce((s, q) => s + (q.points || 1), 0);
  const totalMins = questions.reduce((s, q) => s + (q.time_limit || 0), 0);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {Object.entries(QTYPES).map(([k, m]) => (
        counts[k] ? (
          <span key={k} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                style={{ color: m.color, background: m.bg }}>
            <span>{counts[k]}</span> {m.abbr}
          </span>
        ) : null
      ))}
      <span className="text-xs font-semibold" style={{ color: '#94a3b8' }}>
        {questions.length} question{questions.length > 1 ? 's' : ''} · {totalPts} pts
        {totalMins > 0 && ` · ~${Math.ceil(totalMins / 60)} min`}
      </span>
    </div>
  );
}

/* ── QUESTION EDITOR (single question) ───────────────────────────────────── */
function QuestionEditor({ question, onChange, onDelete, idx }) {
  const [open, setOpen] = useState(idx === 0);
  const qm = QTYPES[question.question_type] || QTYPES.QCU;

  const setField = (k, v) => onChange({ ...question, [k]: v });

  const addChoice = () => {
    const choices = [...(question.choices || []), { id: `c${Date.now()}`, text: '', is_correct: false }];
    setField('choices', choices);
  };

  const removeChoice = (cid) => setField('choices', (question.choices || []).filter(c => c.id !== cid));

  const updateChoice = (cid, key, val) =>
    setField('choices', (question.choices || []).map(c => c.id === cid ? { ...c, [key]: val } : c));

  const toggleCorrect = (cid) => {
    if (question.question_type === 'QCU' || question.question_type === 'TRUEFALSE') {
      setField('choices', (question.choices || []).map(c => ({ ...c, is_correct: c.id === cid })));
    } else {
      updateChoice(cid, 'is_correct', !(question.choices || []).find(c => c.id === cid)?.is_correct);
    }
  };

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: open ? qm.color : '#e2e8f0' }}>
      {/* Header */}
      <button type="button"
              onClick={() => setOpen(!open)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left"
              style={{ background: open ? qm.bg : '#fafafa' }}>
        <GripVertical className="h-4 w-4 flex-shrink-0" style={{ color: '#cbd5e1' }} />
        <QBadge type={question.question_type} />
        <span className="flex-1 text-sm font-semibold truncate" style={{ color: '#1e293b' }}>
          {question.text || `Question ${idx + 1}`}
        </span>
        <span className="text-xs font-bold flex-shrink-0" style={{ color: '#64748b' }}>
          {question.points || 1} pt{(question.points || 1) > 1 ? 's' : ''}
        </span>
        {question.time_limit > 0 && (
          <span className="flex items-center gap-1 text-xs" style={{ color: '#64748b' }}>
            <Clock className="h-3 w-3" /> {question.time_limit}s
          </span>
        )}
        <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="flex-shrink-0 h-6 w-6 rounded-lg flex items-center justify-center hover:bg-red-100"
                style={{ color: '#ef4444' }}>
          <X className="h-3.5 w-3.5" />
        </button>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                     style={{ color: '#94a3b8' }} />
      </button>

      {/* Body */}
      {open && (
        <div className="p-4 space-y-4 border-t" style={{ borderColor: '#f1f5f9' }}>
          {/* Type + meta row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Lbl>Type</Lbl>
              <select value={question.question_type}
                      onChange={e => {
                        const next = { ...question, question_type: e.target.value };
                        if (e.target.value === 'TRUEFALSE') {
                          next.choices = [
                            { id: 'vrai', text: 'Vrai', is_correct: true },
                            { id: 'faux', text: 'Faux', is_correct: false },
                          ];
                        } else if (!next.choices?.length) {
                          next.choices = [
                            { id: `c${Date.now()}a`, text: '', is_correct: true },
                            { id: `c${Date.now()}b`, text: '', is_correct: false },
                          ];
                        }
                        onChange(next);
                      }}
                      className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                      style={{ borderColor: '#e2e8f0', background: '#f8fafc' }}>
                {Object.entries(QTYPES).filter(([k]) => k !== 'PDF').map(([k, m]) => (
                  <option key={k} value={k}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Lbl>Points</Lbl>
              <Input type="number" min="0.5" step="0.5" value={question.points || 1}
                     onChange={e => setField('points', parseFloat(e.target.value) || 1)} />
            </div>
            <div>
              <Lbl>Durée (sec, 0 = illimité)</Lbl>
              <Input type="number" min="0" step="5" value={question.time_limit || 0}
                     onChange={e => setField('time_limit', parseInt(e.target.value) || 0)} />
            </div>
          </div>

          {/* Question text */}
          <div>
            <Lbl>Énoncé de la question *</Lbl>
            <textarea value={question.text || ''}
                      onChange={e => setField('text', e.target.value)}
                      rows={3}
                      placeholder="Saisissez la question ici…"
                      className="w-full px-3 py-2 rounded-xl text-sm border resize-none outline-none"
                      style={{ borderColor: '#e2e8f0', background: '#f8fafc' }} />
          </div>

          {/* Choices (QCU / QCM / TRUEFALSE) */}
          {(question.question_type === 'QCU' || question.question_type === 'QCM' || question.question_type === 'TRUEFALSE') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Lbl>Réponses {question.question_type !== 'TRUEFALSE' ? '(cochez la/les bonne(s))' : ''}</Lbl>
                {question.question_type !== 'TRUEFALSE' && (
                  <button type="button" onClick={addChoice}
                          className="text-xs font-bold flex items-center gap-1" style={{ color: C }}>
                    <Plus className="h-3 w-3" /> Ajouter
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {(question.choices || []).map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <button type="button" onClick={() => toggleCorrect(c.id)}
                            className="flex-shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center transition-all"
                            style={c.is_correct ? { background: '#059669', borderColor: '#059669' } : { borderColor: '#cbd5e1' }}>
                      {c.is_correct && <Check className="h-3 w-3 text-white" />}
                    </button>
                    {question.question_type === 'TRUEFALSE' ? (
                      <span className="flex-1 text-sm font-semibold" style={{ color: '#374151' }}>{c.text}</span>
                    ) : (
                      <input value={c.text} onChange={e => updateChoice(c.id, 'text', e.target.value)}
                             placeholder="Texte du choix…"
                             className="flex-1 px-3 py-1.5 rounded-lg text-sm border outline-none"
                             style={{ borderColor: '#e2e8f0', background: '#f8fafc' }} />
                    )}
                    {question.question_type !== 'TRUEFALSE' && (
                      <button type="button" onClick={() => removeChoice(c.id)}
                              className="flex-shrink-0 h-6 w-6 rounded-lg flex items-center justify-center hover:bg-red-50"
                              style={{ color: '#94a3b8' }}>
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Text question model answer */}
          {question.question_type === 'TEXT' && (
            <div>
              <Lbl>Réponse modèle (pour correction)</Lbl>
              <textarea value={question.model_answer || ''}
                        onChange={e => setField('model_answer', e.target.value)}
                        rows={3}
                        placeholder="Réponse attendue (aide à la correction)…"
                        className="w-full px-3 py-2 rounded-xl text-sm border resize-none outline-none"
                        style={{ borderColor: '#e2e8f0', background: '#f8fafc' }} />
              <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
                Les réponses texte requièrent une correction manuelle ou via IA.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── PDF UPLOAD SECTION ──────────────────────────────────────────────────── */
function PdfSection({ examPdf, examPdfUrl, onFileChange, pdfDuration, onPdfDurationChange }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const inputRef = useRef();
  return (
    <div className="space-y-5">
      <div className="rounded-2xl p-5" style={{ background: '#f5f3ff', border: '1.5px dashed #7c3aed66' }}>
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{ background: '#7c3aed22' }}>
            <FileText className="h-6 w-6" style={{ color: '#7c3aed' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black mb-1" style={{ color: '#1e293b' }}>Épreuve PDF à traiter</p>
            <p className="text-xs" style={{ color: '#64748b' }}>
              Les étudiants téléchargeront ce fichier, compléteront l'épreuve, et soumettront leur copie scannée.
              Prévoyez une durée plus longue pour ce type d'épreuve.
            </p>
          </div>
        </div>
      </div>

      {/* Upload zone */}
      <div>
        <Lbl>Fichier de l'épreuve (PDF)</Lbl>
        <div className="relative rounded-2xl border-2 border-dashed p-4 sm:p-8 text-center cursor-pointer transition-all"
             style={{ borderColor: examPdf || examPdfUrl ? '#7c3aed' : '#e2e8f0', background: examPdf || examPdfUrl ? '#f5f3ff' : '#fafafa' }}
             onClick={() => inputRef.current?.click()}>
          <input ref={inputRef} type="file" accept=".pdf" className="hidden"
                 onChange={e => onFileChange(e.target.files[0] || null)} />
          {examPdf ? (
            <div className="flex items-center justify-center gap-3">
              <FileText className="h-8 w-8" style={{ color: '#7c3aed' }} />
              <div className="text-left">
                <p className="text-sm font-bold" style={{ color: '#1e293b' }}>{examPdf.name}</p>
                <p className="text-xs" style={{ color: '#64748b' }}>
                  {(examPdf.size / 1024 / 1024).toFixed(2)} Mo — Cliquez pour changer
                </p>
              </div>
            </div>
          ) : examPdfUrl ? (
            <div className="flex items-center justify-center gap-3">
              <FileText className="h-8 w-8" style={{ color: '#7c3aed' }} />
              <div className="text-left">
                <p className="text-sm font-bold" style={{ color: '#1e293b' }}>Fichier existant</p>
                <p className="text-xs" style={{ color: '#7c3aed' }}>Cliquez pour remplacer</p>
              </div>
            </div>
          ) : (
            <>
              <Upload className="h-10 w-10 mx-auto mb-3 opacity-30" style={{ color: '#7c3aed' }} />
              <p className="text-sm font-semibold" style={{ color: '#64748b' }}>
                Cliquez pour choisir un fichier PDF
              </p>
              <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>PDF uniquement · Max 50 Mo</p>
            </>
          )}
        </div>

        {/* View the currently-saved PDF — only when no replacement is queued */}
        {examPdfUrl && !examPdf && (
          <button type="button" onClick={() => setPreviewOpen(true)}
            className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold w-full justify-center"
            style={{ background: '#f5f3ff', color: '#7c3aed', border: '1.5px solid #7c3aed33' }}>
            <Eye className="h-3.5 w-3.5" /> Voir le fichier PDF actuellement publié
          </button>
        )}
      </div>

      {previewOpen && <PdfModal url={examPdfUrl} onClose={() => setPreviewOpen(false)} />}

      {/* Extra duration for PDF */}
      <div>
        <Lbl>Durée supplémentaire pour l'épreuve PDF (min)</Lbl>
        <Input type="number" min="0" step="15" value={pdfDuration}
               onChange={e => onPdfDurationChange(parseInt(e.target.value) || 0)}
               placeholder="Ex: 120" />
        <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
          Cette durée s'ajoute à la durée globale de l'examen pour les étudiants qui traitent l'épreuve PDF.
        </p>
      </div>
    </div>
  );
}

/* ── EXAM BUILDER MODAL ──────────────────────────────────────────────────── */
function ExamBuilderModal({ open, onClose, editing, classesList = [], subjectsList = [], sitesList = [], onSaved, notify = () => {} }) {
  const [tab, setTab]         = useState('info');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [examPdf, setExamPdf]     = useState(null);
  const [pdfDuration, setPdfDuration] = useState(0);
  const [quizLoading, setQuizLoading] = useState(false);
  // Snapshot of questions exactly as loaded from the API, so a save that never
  // touched the Questions tab can skip re-persisting all of them one by one.
  const loadedQuestionsRef = useRef('[]');

  const blank = {
    title: '', description: '', class_objs: [], subject: '',
    is_global: false, site: '',
    exam_type: 'FINAL', duration_minutes: 60, start_date: '', end_date: '',
    max_attempts: 1, pass_score_percent: 50, coefficient: 1,
    fullscreen_required: true, webcam_required: false,
    block_copy_paste: true, max_tab_switches: 1,
    require_student_photo: false, ai_proctoring: false,
    is_published: false,
  };
  const [form, setForm] = useState(blank);
  const F = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  // Load existing exam data
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        ...blank, ...editing,
        class_objs: editing.class_obj ? [String(editing.class_obj)] : [],
        subject:    String(editing.subject || ''),
        is_global:  !!editing.is_global,
        site:       String(editing.site || ''),
        start_date: editing.start_date?.slice(0, 16) || '',
        end_date:   editing.end_date?.slice(0, 16) || '',
      });
      // Load quiz questions if linked
      if (editing.quiz) {
        setQuizLoading(true);
        elearningService.getQuestions(editing.quiz).then(res => {
          const qs = Array.isArray(res) ? res : res?.results || [];
          const loaded = qs.map(q => ({
            id: q.id,
            question_type: q.question_type,
            text: q.text,
            points: q.points || 1,
            time_limit: q.time_limit || 0,
            model_answer: q.model_answer || '',
            choices: (q.choices || []).map(c => ({ id: c.id, text: c.text, is_correct: c.is_correct })),
          }));
          setQuestions(loaded);
          loadedQuestionsRef.current = JSON.stringify(loaded);
          setQuizLoading(false);
        }).catch(() => setQuizLoading(false));
      } else {
        setQuestions([]);
        loadedQuestionsRef.current = '[]';
      }
      setExamPdf(null);
      setPdfDuration(editing.pdf_extra_duration || 0);
    } else {
      setForm(blank);
      setQuestions([]);
      loadedQuestionsRef.current = '[]';
      setExamPdf(null);
      setPdfDuration(0);
    }
    setTab('info');
  }, [open, editing?.id]);

  const addQuestion = (type) => {
    const isVF = type === 'TRUEFALSE';
    const newQ = {
      id: `new-${Date.now()}`,
      question_type: type,
      text: '',
      points: 1,
      time_limit: 0,
      model_answer: '',
      choices: isVF
        ? [{ id: 'vrai', text: 'Vrai', is_correct: true }, { id: 'faux', text: 'Faux', is_correct: false }]
        : [
          { id: `c${Date.now()}a`, text: '', is_correct: true },
          { id: `c${Date.now()}b`, text: '', is_correct: false },
          { id: `c${Date.now()}c`, text: '', is_correct: false },
        ],
    };
    setQuestions(prev => [...prev, newQ]);
    setTab('questions');
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!form.start_date) {
      notify({ type: 'error', title: 'Date requise', message: 'Merci de renseigner la date de composition de l\'examen.' });
      return;
    }
    if (!form.is_global && form.class_objs.length === 0) {
      notify({ type: 'error', title: 'Classe requise', message: 'Sélectionnez au moins une classe.' });
      return;
    }
    setLoading(true);
    try {
      // Skip re-persisting questions/choices entirely when the Questions tab
      // was never touched (e.g. a metadata-only edit from the Informations
      // tab) — this used to unconditionally re-save every question and every
      // choice one request at a time on every save, which is what made even
      // trivial edits slow. Only relevant when editing a single existing exam.
      const questionsChanged = JSON.stringify(questions) !== loadedQuestionsRef.current;

      const basePayload = {
        ...form,
        pdf_extra_duration: pdfDuration,
        start_date: form.start_date || null,
        end_date:   form.end_date || null,
        // duration_minutes/max_attempts can be '' mid-edit (see the inputs
        // above) — only fall back to a default once, here, at submit time.
        duration_minutes: parseInt(form.duration_minutes) || 60,
        max_attempts: parseInt(form.max_attempts) || 1,
      };
      delete basePayload.class_objs;
      // Never send subject_file as a string — the file is handled separately via FormData
      delete basePayload.subject_file;

      let pdfError = null;

      // Uploads the PDF (if any) to one already-saved exam; failures surface
      // instead of being swallowed (see "Format d'examen non configuré").
      const uploadPdfIfAny = async (examId) => {
        if (!examPdf || !examId) return;
        const fd = new FormData();
        fd.append('subject_file', examPdf);
        await elearningService.uploadSecureExamPdf(examId, fd).catch(err => { pdfError = pdfError || err; });
      };

      if (editing) {
        // Single row, single class — unchanged behaviour from before
        // multi-class creation existed.
        const classId = form.is_global ? null : form.class_objs[0];
        let quizId = form.is_global ? null : (editing?.quiz || null);

        if (!form.is_global && questions.length > 0 && classId && form.subject && questionsChanged) {
          if (!quizId) {
            const quiz = await elearningService.createQuiz({
              title: `Quiz – ${form.title || 'Examen'}`, class_obj: classId, subject: form.subject,
            });
            quizId = quiz.id;
          }
          await Promise.all(questions.map(async (q) => {
            const isNew = String(q.id).startsWith('new-');
            const qPayload = {
              quiz: quizId, question_type: q.question_type, text: q.text,
              points: q.points || 1, time_limit: q.time_limit || 0, model_answer: q.model_answer || '',
            };
            const savedQ = isNew
              ? await elearningService.createQuestion(qPayload)
              : await elearningService.updateQuestion(q.id, qPayload);
            if (q.question_type !== 'TEXT') {
              await Promise.all((q.choices || []).map(c => {
                if (!c.text?.trim()) return null;
                const cPayload = { question: savedQ.id, text: c.text.trim(), is_correct: !!c.is_correct };
                const isNewChoice = typeof c.id === 'string' && (c.id.startsWith('c') || c.id === 'vrai' || c.id === 'faux');
                if (isNew || isNewChoice) return elearningService.createChoice(cPayload);
                return elearningService.updateChoice(c.id, cPayload).catch(() => {});
              }));
            }
          }));
        }

        const savedExam = await elearningService.updateSecureExam(editing.id, {
          ...basePayload, class_obj: classId, subject: form.is_global ? null : form.subject, quiz: quizId,
          site: form.is_global ? (form.site || null) : null,
        });
        await uploadPdfIfAny(savedExam?.id);
      } else if (form.is_global) {
        // One single exam, open to every student regardless of filière/classe —
        // no auto-graded quiz possible here (Quiz.class_obj/subject are
        // required), so this only ever carries a PDF sujet.
        const exam = await elearningService.createSecureExam({
          ...basePayload, class_obj: null, subject: null, quiz: null, site: form.site || null,
        });
        await uploadPdfIfAny(exam?.id);
      } else {
        // Creation — same matière is often taught across several classes for
        // the same filière, so one independent exam (with its own quiz/
        // questions copy) is created per selected class instead of forcing
        // the admin to redo this whole form once per class.
        for (const classId of form.class_objs) {
          let quizId = null;
          if (questions.length > 0 && classId && form.subject) {
            const quiz = await elearningService.createQuiz({
              title: `Quiz – ${form.title || 'Examen'}`, class_obj: classId, subject: form.subject,
            });
            quizId = quiz.id;
            await Promise.all(questions.map(async (q) => {
              const savedQ = await elearningService.createQuestion({
                quiz: quizId, question_type: q.question_type, text: q.text,
                points: q.points || 1, time_limit: q.time_limit || 0, model_answer: q.model_answer || '',
              });
              if (q.question_type !== 'TEXT') {
                await Promise.all((q.choices || []).map(c => {
                  if (!c.text?.trim()) return null;
                  return elearningService.createChoice({ question: savedQ.id, text: c.text.trim(), is_correct: !!c.is_correct });
                }));
              }
            }));
          }
          const exam = await elearningService.createSecureExam({ ...basePayload, class_obj: classId, quiz: quizId });
          await uploadPdfIfAny(exam?.id);
        }
      }

      if (pdfError) {
        notify({
          type: 'error',
          title: 'Examen enregistré, mais l\'envoi du PDF a échoué',
          message: pdfError.message || 'Réessayez d\'attacher le fichier depuis l\'onglet Épreuve PDF.',
        });
      } else {
        notify({
          type: 'success',
          title: editing ? 'Examen modifié' : (form.class_objs.length > 1 ? `${form.class_objs.length} examens créés` : 'Examen créé'),
          message: '',
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      notify({ type: 'error', title: 'Erreur', message: err.message || 'Enregistrement échoué' });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const TABS = [
    { id: 'info',      label: 'Informations',   icon: Info },
    { id: 'questions', label: `Questions (${questions.length})`, icon: BookOpen },
    { id: 'pdf',       label: 'Épreuve PDF',     icon: FileText },
    { id: 'security',  label: 'Sécurité',        icon: Lock },
  ];

  return createPortal(
    <div className="fixed inset-0 flex items-end md:items-center justify-center z-50"
         style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
         onClick={onClose}>
      <div className="bg-white w-full md:w-[780px] md:rounded-3xl max-h-[95vh] flex flex-col overflow-hidden"
           style={{ boxShadow: '0 40px 100px rgba(0,0,0,0.25)' }}
           onClick={e => e.stopPropagation()}>

        {/* Color bar */}
        <div className="h-1 rounded-t-3xl" style={{ background: `linear-gradient(90deg,${C},#7c3aed)` }} />

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: '#fee2e2' }}>
              <Shield className="h-5 w-5" style={{ color: C }} />
            </div>
            <h2 className="text-base font-black truncate" style={{ color: '#0f172a' }}>
              {editing ? 'Modifier l\'examen' : 'Nouvel examen'}
            </h2>
          </div>
          <button onClick={onClose}
                  className="h-8 w-8 rounded-xl flex items-center justify-center transition-all hover:bg-red-50"
                  style={{ color: '#64748b' }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b overflow-x-auto" style={{ borderColor: '#f1f5f9', background: '#fafafa' }}>
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} type="button" onClick={() => setTab(t.id)}
                      className="flex items-center gap-1.5 px-3 sm:px-5 py-3 text-xs font-bold border-b-2 transition-all flex-shrink-0 whitespace-nowrap"
                      style={{
                        borderColor: active ? C : 'transparent',
                        color: active ? C : '#64748b',
                        background: active ? 'white' : 'transparent',
                      }}>
                <Icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">

          {/* ── INFO TAB ── */}
          {tab === 'info' && (
            <>
              <div><Lbl>Titre de l'examen</Lbl>
                <Input value={form.title} onChange={e => F('title')(e.target.value)} placeholder="Ex: Examen final - Mathématiques S1" />
              </div>
              <div><Lbl>Description</Lbl>
                <textarea value={form.description} onChange={e => F('description')(e.target.value)}
                          rows={2} placeholder="Instructions, consignes spéciales…"
                          className="w-full px-3 py-2 rounded-xl text-sm border outline-none resize-none"
                          style={{ borderColor: '#e2e8f0', background: '#f8fafc' }} />
              </div>
              <label className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
                     style={{ background: form.is_global ? '#fff7ed' : '#f8fafc', border: `1.5px solid ${form.is_global ? '#fdba74' : '#e2e8f0'}` }}
                     onClick={() => F('is_global')(!form.is_global)}>
                <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${form.is_global ? '#ea580c' : '#cbd5e1'}`, background: form.is_global ? '#ea580c' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {form.is_global && <CheckSquare className="h-3 w-3 text-white" />}
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: form.is_global ? '#9a3412' : '#374151' }}>
                    Examen ouvert à tous (simulation)
                  </p>
                  <p className="text-xs" style={{ color: '#94a3b8' }}>
                    Accessible à tous les étudiants, toutes filières et classes confondues — pas de sujet auto-corrigé (QCM), sujet PDF uniquement.
                  </p>
                </div>
              </label>

              {form.is_global ? (
                <div>
                  <Lbl>Site</Lbl>
                  <select value={form.site} onChange={e => F('site')(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                          style={{ borderColor: '#e2e8f0', background: '#f8fafc' }}>
                    <option value="">Tous les sites</option>
                    {sitesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Lbl>{editing ? 'Classe' : 'Classe(s)'}</Lbl>
                    <ClassPicker classesList={classesList} value={form.class_objs}
                                 onChange={v => F('class_objs')(v)} multiple={!editing} />
                    {!editing && (
                      <p className="text-[10px] mt-1" style={{ color: '#94a3b8' }}>
                        Sélectionnez plusieurs classes pour créer le même examen dans chacune d'elles.
                      </p>
                    )}
                  </div>
                  <div><Lbl>Matière</Lbl>
                    <select value={form.subject} onChange={e => F('subject')(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                            style={{ borderColor: '#e2e8f0', background: '#f8fafc' }}>
                      <option value="">Sélectionner…</option>
                      {subjectsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div><Lbl>Type</Lbl>
                  <select value={form.exam_type} onChange={e => F('exam_type')(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                          style={{ borderColor: '#e2e8f0', background: '#f8fafc' }}>
                    {EXAM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div><Lbl>Durée globale (min)</Lbl>
                  {/* `|| 60` on every keystroke used to snap the field back to
                      60 the instant it was cleared (parseInt('') is NaN, which
                      is falsy) — before the next digit was even typed, so
                      clearing "60" and typing "30" produced "6030" instead of
                      "30". Allow an empty string as a valid mid-edit state;
                      the fallback only applies once, at submit time below. */}
                  <Input type="number" min="10" value={form.duration_minutes}
                         onChange={e => F('duration_minutes')(e.target.value === '' ? '' : parseInt(e.target.value) || '')} />
                </div>
                <div><Lbl>Nb tentatives</Lbl>
                  <Input type="number" min="1" value={form.max_attempts}
                         onChange={e => F('max_attempts')(e.target.value === '' ? '' : parseInt(e.target.value) || '')} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div><Lbl>Note de passage (%)</Lbl>
                  <Input type="number" min="0" max="100" value={form.pass_score_percent} onChange={e => F('pass_score_percent')(parseInt(e.target.value) || 50)} />
                </div>
                <div><Lbl>Coefficient</Lbl>
                  <Input type="number" step="0.5" min="0.5" value={form.coefficient} onChange={e => F('coefficient')(parseFloat(e.target.value) || 1)} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Lbl>Date de composition *</Lbl>
                  <Input type="datetime-local" required value={form.start_date} onChange={e => F('start_date')(e.target.value)} />
                </div>
                <div><Lbl>Date de fin</Lbl>
                  <Input type="datetime-local" value={form.end_date} onChange={e => F('end_date')(e.target.value)} />
                </div>
              </div>
            </>
          )}

          {/* ── QUESTIONS TAB ── */}
          {tab === 'questions' && (
            <>
              {/* Add buttons */}
              <div className="flex items-center justify-between">
                <QuestionCounters questions={questions} />
                <div className="flex items-center gap-2">
                  {Object.entries(QTYPES).filter(([k]) => k !== 'PDF').map(([k, m]) => (
                    <button key={k} type="button" onClick={() => addQuestion(k)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                            style={{ background: m.bg, color: m.color }}>
                      <Plus className="h-3.5 w-3.5" /> {m.abbr}
                    </button>
                  ))}
                </div>
              </div>

              {/* Questions list */}
              {quizLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 rounded-full border-[3px] animate-spin" style={{ borderColor: '#fee2e2', borderTopColor: C }} />
                </div>
              ) : questions.length === 0 ? (
                <div className="flex flex-col items-center py-16 rounded-2xl"
                     style={{ border: '1.5px dashed #e2e8f0' }}>
                  <BookOpen className="h-10 w-10 mb-3 opacity-20" style={{ color: C }} />
                  <p className="text-sm font-bold" style={{ color: '#64748b' }}>Aucune question</p>
                  <p className="text-xs mt-1 mb-4" style={{ color: '#94a3b8' }}>
                    Utilisez les boutons ci-dessus pour ajouter des questions
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {questions.map((q, i) => (
                    <QuestionEditor key={q.id} idx={i} question={q}
                                    onChange={upd => setQuestions(prev => prev.map(x => x.id === q.id ? upd : x))}
                                    onDelete={() => setQuestions(prev => prev.filter(x => x.id !== q.id))} />
                  ))}
                </div>
              )}

              {/* Timing summary */}
              {questions.length > 0 && (
                <div className="rounded-2xl p-4" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <p className="text-xs font-black mb-2" style={{ color: '#64748b' }}>RÉCAPITULATIF DU TEMPS</p>
                  <div className="space-y-1">
                    {Object.entries(QTYPES).filter(([k]) => k !== 'PDF').map(([k, m]) => {
                      const qs = questions.filter(q => q.question_type === k);
                      if (!qs.length) return null;
                      const withTimer  = qs.filter(q => q.time_limit > 0);
                      const totalSecs  = withTimer.reduce((s, q) => s + q.time_limit, 0);
                      return (
                        <div key={k} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2">
                            <QBadge type={k} />
                            <span style={{ color: '#64748b' }}>{qs.length} question{qs.length > 1 ? 's' : ''}</span>
                          </span>
                          <span style={{ color: totalSecs ? '#374151' : '#94a3b8' }}>
                            {totalSecs > 0 ? `${Math.ceil(totalSecs / 60)} min chrono` : 'Pas de chrono par question'}
                          </span>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between text-xs pt-1 border-t" style={{ borderColor: '#e2e8f0' }}>
                      <span className="font-bold" style={{ color: '#374151' }}>Durée globale configurée</span>
                      <span className="font-bold" style={{ color: C }}>{form.duration_minutes} min</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── PDF TAB ── */}
          {tab === 'pdf' && (
            <PdfSection
              examPdf={examPdf}
              examPdfUrl={editing?.exam_pdf}
              onFileChange={setExamPdf}
              pdfDuration={pdfDuration}
              onPdfDurationChange={setPdfDuration}
            />
          )}

          {/* ── SECURITY TAB ── */}
          {tab === 'security' && (
            <div className="space-y-5">
              <div className="rounded-2xl p-5" style={{ background: '#fff5f5', border: '1.5px solid #fecaca' }}>
                <p className="text-xs font-black uppercase tracking-wide mb-4" style={{ color: C }}>Paramètres anti-triche</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    ['fullscreen_required', 'Mode plein écran obligatoire', ''],
                    ['block_copy_paste', 'Bloquer copier/coller', ''],
                    ['webcam_required', 'Webcam obligatoire', ''],
                    ['require_student_photo', 'Photo étudiante requise', ''],
                    ['ai_proctoring', 'Surveillance IA (détection visage)', ''],
                  ].map(([k, label]) => (
                    <label key={k} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form[k]} onChange={e => F(k)(e.target.checked)}
                             className="h-4 w-4 rounded" style={{ accentColor: C }} />
                      <span className="text-sm font-semibold" style={{ color: '#374151' }}>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Lbl>Changements d'onglets tolérés (0 = aucun)</Lbl>
                <Input type="number" min="0" value={form.max_tab_switches}
                       onChange={e => F('max_tab_switches')(parseInt(e.target.value) || 0)}
                       style={{ maxWidth: 160 }} />
                <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
                  0 = marqué fraudeur immédiatement au premier changement d'onglet
                </p>
              </div>
              <label className="flex items-center gap-3 p-4 rounded-2xl cursor-pointer"
                     style={{ background: form.is_published ? '#f0fdf4' : '#fafafa', border: '1px solid #e2e8f0' }}>
                <input type="checkbox" checked={form.is_published} onChange={e => F('is_published')(e.target.checked)}
                       className="h-4 w-4 rounded" style={{ accentColor: '#059669' }} />
                <div>
                  <p className="text-sm font-bold" style={{ color: '#1e293b' }}>Publier l'examen</p>
                  <p className="text-xs" style={{ color: '#64748b' }}>
                    Les étudiants pourront accéder à l'examen dès que la date de début est atteinte.
                  </p>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-6 py-4" style={{ borderTop: '1px solid #f1f5f9' }}>
          <button type="button" onClick={onClose}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold border"
                  style={{ color: '#64748b', borderColor: '#e2e8f0' }}>Annuler</button>
          <div className="flex items-center gap-2 flex-wrap">
            {tab !== 'security' && (
              <button type="button"
                      onClick={() => {
                        const order = ['info','questions','pdf','security'];
                        const next = order[order.indexOf(tab) + 1];
                        if (next) setTab(next);
                      }}
                      className="px-5 py-2.5 rounded-xl text-sm font-semibold"
                      style={{ background: '#f1f5f9', color: '#374151' }}>
                Suivant →
              </button>
            )}
            <button type="button" onClick={handleSave} disabled={loading}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                    style={{ background: `linear-gradient(135deg,${C},#dc2626)`, boxShadow: `0 4px 14px ${C}40` }}>
              <Save className="h-4 w-4" />
              {loading ? 'Enregistrement…' : (editing ? 'Mettre à jour' : 'Créer l\'examen')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── QUESTION BANK ───────────────────────────────────────────────────────── */
function QuestionBankView({ subjectsList = [], classesList = [], notify = () => {} }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [subject, setSubject]     = useState('');

  const load = useCallback(() => {
    setLoading(true);
    // Get all quiz questions (bank)
    const params = subject ? `?quiz__subject=${subject}` : '';
    fetch(`/api/elearning/quiz-questions/${params}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
    }).then(r => r.json()).then(d => {
      setQuestions(Array.isArray(d) ? d : d?.results || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [subject]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select value={subject} onChange={e => setSubject(e.target.value)}
                className="px-3 py-2 rounded-xl text-sm border outline-none"
                style={{ borderColor: '#e2e8f0', background: 'white' }}>
          <option value="">Toutes les matières</option>
          {subjectsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button onClick={load} className="p-2 rounded-xl" style={{ background: '#f1f5f9' }}>
          <RefreshCw className="h-4 w-4" style={{ color: '#64748b' }} />
        </button>
        <span className="text-xs" style={{ color: '#94a3b8' }}>{questions.length} questions</span>
      </div>
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 rounded-full border-[3px] animate-spin" style={{ borderColor: '#fee2e2', borderTopColor: C }} />
        </div>
      ) : questions.length === 0 ? (
        <div className="flex flex-col items-center py-16 rounded-2xl" style={{ border: '1.5px dashed #e2e8f0' }}>
          <Database className="h-10 w-10 mb-3 opacity-20" style={{ color: C }} />
          <p className="text-sm font-bold" style={{ color: '#64748b' }}>Banque vide</p>
          <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>Créez des questions dans un quiz ou un examen</p>
        </div>
      ) : (
        <div className="space-y-2">
          {questions.map(q => (
            <div key={q.id} className="p-4 rounded-2xl flex items-start gap-3"
                 style={{ background: 'white', border: '1px solid #f1f5f9' }}>
              <QBadge type={q.question_type} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: '#1e293b' }}>{q.text}</p>
                <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
                  {q.quiz_title || '—'} · {q.points || 1} pt
                  {q.time_limit > 0 ? ` · ⏱ ${q.time_limit}s` : ''}
                </p>
              </div>
              {(q.choices || []).filter(c => c.is_correct).length > 0 && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Check className="h-3 w-3" style={{ color: '#059669' }} />
                  <span className="text-xs font-bold" style={{ color: '#059669' }}>Corrigée</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── PROCTORING DASHBOARD ────────────────────────────────────────────────── */
function ProctorDashboard({ examId, sessions, onClose, onRefresh }) {
  const [sel, setSel] = useState(null);
  const [autoR, setAutoR] = useState(true);

  useEffect(() => {
    if (!autoR) return;
    const t = setInterval(onRefresh, 10000);
    return () => clearInterval(t);
  }, [autoR, onRefresh]);

  const flagged   = sessions.filter(s => s.is_flagged);
  const active    = sessions.filter(s => s.status === 'STARTED');
  const submitted = sessions.filter(s => s.status === 'SUBMITTED');

  const riskColor = (s) =>
    s.is_flagged ? '#ef4444' : s.tab_switch_count > 2 || s.copy_attempt_count > 0 ? '#f59e0b' : '#10b981';

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4 z-50"
         style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)' }}
         onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
           style={{ boxShadow: '0 40px 100px rgba(0,0,0,0.25)' }}
           onClick={e => e.stopPropagation()}>
        <div className="h-1 rounded-t-3xl" style={{ background: 'linear-gradient(90deg,#ef4444,#7c3aed)' }} />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 py-4" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <div className="min-w-0">
            <h2 className="text-base font-black truncate">Surveillance en temps réel</h2>
            <div className="flex gap-4 mt-0.5 text-xs flex-wrap">
              <span className="font-bold" style={{ color: '#059669' }}>{active.length} en cours</span>
              <span className="font-bold" style={{ color: '#ef4444' }}>{flagged.length} signalés</span>
              <span style={{ color: '#94a3b8' }}>{submitted.length} soumis</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: '#64748b' }}>
              <input type="checkbox" checked={autoR} onChange={e => setAutoR(e.target.checked)} className="rounded" />
              Auto-refresh
            </label>
            <button onClick={onRefresh} className="p-2 rounded-xl hover:bg-gray-50"><RefreshCw size={15} style={{ color: '#64748b' }} /></button>
            <button onClick={onClose} className="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-gray-50">
              <X size={16} style={{ color: '#64748b' }} />
            </button>
          </div>
        </div>
        <div className="flex flex-col lg:flex-row flex-1 min-h-0">
          <div className="w-full lg:w-72 lg:flex-shrink-0 border-b lg:border-b-0 lg:border-r overflow-y-auto max-h-64 lg:max-h-none" style={{ borderColor: '#f1f5f9' }}>
            {sessions.length === 0 ? (
              <div className="flex flex-col items-center py-12 opacity-40">
                <Users size={32} className="mb-2" /><p className="text-sm">Aucune session</p>
              </div>
            ) : sessions.map(s => (
              <button key={s.id} onClick={() => setSel(s)}
                      className="w-full text-left px-4 py-3 border-b transition-colors"
                      style={{ borderColor: '#f1f5f9', background: sel?.id === s.id ? '#eef2ff' : 'white' }}>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: riskColor(s) }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: '#1e293b' }}>
                      {s.student_name || s.student_matricule}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: s.is_flagged ? '#ef4444' : '#94a3b8' }}>
                      {s.status === 'STARTED' ? 'En cours' : s.status === 'SUBMITTED' ? 'Soumis' : 'Signalé'}
                      {s.tab_switch_count > 0 && ` · ${s.tab_switch_count} onglet(s)`}
                    </p>
                  </div>
                  {s.is_flagged && <AlertTriangle size={14} style={{ color: '#ef4444' }} />}
                </div>
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {sel ? (
              <div className="space-y-4">
                <h3 className="text-lg font-black" style={{ color: '#1e293b' }}>{sel.student_name}</h3>
                {sel.is_flagged && (
                  <div className="flex items-center gap-2 rounded-xl p-3 text-sm"
                       style={{ background: '#fef2f2', color: '#dc2626' }}>
                    <AlertTriangle size={16} /> {sel.flag_reason || 'Session signalée'}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { label: 'Changements onglet', value: sel.tab_switch_count, warn: 2 },
                    { label: 'Sorties plein écran', value: sel.fullscreen_exit_count, warn: 1 },
                    { label: 'Tentatives copie', value: sel.copy_attempt_count, warn: 1 },
                    { label: 'Pertes de focus', value: sel.focus_lost_count, warn: 3 },
                  ].map(m => (
                    <div key={m.label} className="p-3 rounded-xl border"
                         style={m.value > m.warn ? { background: '#fef2f2', borderColor: '#fecaca' } : { background: '#f8fafc', borderColor: '#e2e8f0' }}>
                      <p className="text-xs" style={{ color: '#64748b' }}>{m.label}</p>
                      <p className="text-2xl font-black mt-0.5" style={{ color: m.value > m.warn ? '#ef4444' : '#1e293b' }}>
                        {m.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full opacity-30">
                <Users size={40} className="mb-3" /><p className="text-sm">Sélectionnez un étudiant</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── MAIN EXAM MANAGER ───────────────────────────────────────────────────── */
export default function ExamManager({ classesList = [], subjectsList = [], selectedClass, notify = () => {} }) {
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [viewTab, setViewTab]   = useState('exams'); // 'exams' | 'bank'
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [showSessions, setShowSessions] = useState(null);
  const confirm = useConfirm();
  const { sites } = useSite();

  const classFilter = selectedClass && selectedClass !== 'all' ? { class_obj: selectedClass } : {};
  const { data, refetch } = useApi(() => elearningService.getSecureExams({ ...classFilter, page_size: 200 }), [selectedClass], true);
  const allExams = data?.results || data || [];

  // Filter by search + reset page when search changes
  const exams = search.trim()
    ? allExams.filter(e =>
        e.title?.toLowerCase().includes(search.toLowerCase()) ||
        e.subject_name?.toLowerCase().includes(search.toLowerCase()) ||
        e.class_name?.toLowerCase().includes(search.toLowerCase())
      )
    : allExams;

  const handleSaved = () => { refetch(); setPage(1); };

  const { data: sessionsData, refetch: refetchSessions } = useApi(
    () => showSessions ? elearningService.getExamSessions(showSessions) : Promise.resolve([]),
    [showSessions], true
  );
  const sessions = sessionsData || [];

  const totalPages = Math.ceil(exams.length / ITEMS);
  const paginated  = exams.slice((page - 1) * ITEMS, page * ITEMS);

  const handleDelete = async (exam) => {
    if (!await confirm({ title: `Supprimer "${exam.title}" ?`, message: 'Action irréversible.', confirmLabel: 'Supprimer', destructive: true })) return;
    try { await elearningService.deleteSecureExam(exam.id); notify({ type: 'success', title: 'Supprimé', message: '' }); refetch(); setPage(1); }
    catch { notify({ type: 'error', title: 'Erreur', message: 'Impossible de supprimer' }); }
  };

  const handlePublish = async (exam) => {
    try { await elearningService.publishSecureExam(exam.id); notify({ type: 'success', title: 'Publié', message: '' }); refetch(); }
    catch { notify({ type: 'error', title: 'Erreur', message: 'Publication échouée' }); }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          {[['exams','Examens'],['bank','Banque de questions']].map(([k,l]) => (
            <button key={k} onClick={() => setViewTab(k)}
                    className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
                    style={viewTab === k ? { background: C, color: 'white' } : { background: '#f1f5f9', color: '#64748b' }}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-sm">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Rechercher un examen…"
              className="w-full pl-8 pr-3 py-2 rounded-xl text-sm border outline-none focus:ring-2"
              style={{ borderColor: '#e2e8f0', background: '#f8fafc', focusRingColor: C }}
            />
            <svg className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        {viewTab === 'exams' && (
          <button onClick={() => { setEditing(null); setShowModal(true); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ background: `linear-gradient(135deg,${C},#dc2626)`, boxShadow: `0 4px 14px ${C}40` }}>
            <Plus className="h-4 w-4" /> Nouvel examen
          </button>
        )}
      </div>

      {/* ── EXAM LIST ── */}
      {viewTab === 'exams' && (
        paginated.length === 0 ? (
          <div className="flex flex-col items-center py-16 rounded-2xl" style={{ border: '1.5px dashed #f1f5f9' }}>
            <div className="h-14 w-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#fff1f2' }}>
              <Shield className="h-7 w-7 opacity-40" style={{ color: C }} />
            </div>
            <p className="text-sm font-bold" style={{ color: '#64748b' }}>Aucun examen</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {paginated.map(exam => {
                const tc = TYPE_COLORS[exam.exam_type] || C;
                const tl = EXAM_TYPES.find(t => t.value === exam.exam_type)?.label || exam.exam_type;
                return (
                  <div key={exam.id} className="p-4 rounded-2xl transition-all cursor-default"
                       style={{ border: '1.5px solid #f0f4f9', background: 'white' }}>
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                      <div className="flex items-start gap-4 min-w-0 flex-1">
                        <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                             style={{ background: `${tc}22` }}>
                          <Shield className="h-5 w-5" style={{ color: tc }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-sm font-black" style={{ color: '#0f172a' }}>{exam.title}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                  style={{ background: `${tc}22`, color: tc }}>{tl}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                  style={{ background: exam.is_published ? '#d1fae5' : '#fef9c3', color: exam.is_published ? '#065f46' : '#92400e' }}>
                              {exam.is_published ? 'Publié' : 'Brouillon'}
                            </span>
                            {exam.is_available && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse"
                                    style={{ background: '#fee2e2', color: '#dc2626' }}>EN COURS</span>
                            )}
                            {exam.quiz && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                    style={{ background: '#eef2ff', color: '#6366f1' }}>
                                {exam.questions_count || '?'} questions
                              </span>
                            )}
                            {exam.exam_pdf && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                    style={{ background: '#f5f3ff', color: '#7c3aed' }}>📄 PDF</span>
                            )}
                            {exam.is_global && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                    style={{ background: '#ffedd5', color: '#9a3412' }}>🌐 Simulation</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: '#64748b' }}>
                            <span>{exam.is_global ? `Ouvert à tous — ${exam.site_name || 'tous les sites'}` : `${exam.class_name} — ${exam.subject_name}`}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />{exam.duration_minutes} min
                            </span>
                            {exam.start_date ? (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(exam.start_date).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1" style={{ color: '#f59e0b' }}>
                                <Calendar className="h-3 w-3" /> Date non définie
                              </span>
                            )}
                            <span>Seuil : {exam.pass_score_percent}%</span>
                            <span>Coeff : {exam.coefficient}</span>
                            <div className="flex gap-1">
                              {exam.fullscreen_required && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: '#fee2e2', color: '#ef4444' }}>Plein écran</span>}
                              {exam.webcam_required && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: '#ede9fe', color: '#7c3aed' }}>Webcam</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 self-end sm:self-auto">
                        {!exam.is_published && (
                          <IconBtn onClick={() => handlePublish(exam)} icon={CheckCircle} color="#059669" hoverBg="#d1fae5" title="Publier" />
                        )}
                        <IconBtn onClick={() => setShowSessions(exam.id)} icon={Eye} color="#7c3aed" hoverBg="#ede9fe" title="Sessions" />
                        <IconBtn onClick={() => { setEditing(exam); setShowModal(true); }} icon={Edit} color="#2563eb" hoverBg="#dbeafe" title="Modifier" />
                        <IconBtn onClick={() => handleDelete(exam)} icon={Trash2} color="#ef4444" hoverBg="#fee2e2" title="Supprimer" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage}
                        accentColor={C} totalItems={exams.length} itemsPerPage={ITEMS} />
          </>
        )
      )}

      {/* ── QUESTION BANK ── */}
      {viewTab === 'bank' && (
        <QuestionBankView subjectsList={subjectsList} classesList={classesList} notify={notify} />
      )}

      {/* Modals */}
      <ExamBuilderModal
        open={showModal}
        onClose={() => setShowModal(false)}
        editing={editing}
        classesList={classesList}
        subjectsList={subjectsList}
        sitesList={sites}
        onSaved={handleSaved}
        notify={notify}
      />

      {showSessions && (
        <ProctorDashboard
          examId={showSessions}
          sessions={sessions}
          onClose={() => setShowSessions(null)}
          onRefresh={refetchSessions}
        />
      )}
    </div>
  );
}
