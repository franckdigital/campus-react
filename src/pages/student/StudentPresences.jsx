import { useState } from 'react';
import {
  CheckSquare, CheckCircle, XCircle, Clock, RefreshCw,
  Plus, X, FileText, Send, Info, AlertTriangle, ChevronDown, ChevronUp,
  Upload, Paperclip,
} from 'lucide-react';
import { studentsService } from '../../services/students';
import { attendanceService } from '../../services/attendance';
import { useApi } from '../../hooks/useApi';

/* ── tokens ─────────────────────────────────────────────────────── */
const CA = '#0891b2'; const CB = '#ecfeff';

const STATUS_MAP = {
  PRESENT: { label: 'Présent',   icon: CheckCircle, color: '#059669', bg: '#f0fdf4' },
  ABSENT:  { label: 'Absent',    icon: XCircle,     color: '#dc2626', bg: '#fef2f2' },
  LATE:    { label: 'En retard', icon: Clock,       color: '#d97706', bg: '#fffbeb' },
  EXCUSED: { label: 'Excusé',   icon: CheckCircle, color: '#7c3aed', bg: '#f5f3ff' },
};

const REQ_STATUS = {
  PENDING:  { label: 'En attente', color: '#d97706', bg: '#fef3c7' },
  APPROVED: { label: 'Approuvée',  color: '#059669', bg: '#d1fae5' },
  REJECTED: { label: 'Refusée',    color: '#ef4444', bg: '#fee2e2' },
};

const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

/* ── Workflow steps ──────────────────────────────────────────────── */
const WORKFLOW = [
  {
    step: '1',
    color: '#0891b2', bg: '#ecfeff',
    title: 'L\'admin marque les présences',
    desc: 'Après chaque séance de cours, l\'administration enregistre votre présence, retard ou absence. Vous voyez le résultat ici automatiquement.',
  },
  {
    step: '2',
    color: '#ef4444', bg: '#fee2e2',
    title: 'Absence non prévue → parent notifié',
    desc: 'Si vous êtes marqué absent sans demande préalable, vos parents reçoivent automatiquement une notification avec le nom du cours et l\'heure.',
  },
  {
    step: '3',
    color: '#d97706', bg: '#fef3c7',
    title: 'Déclarer une absence justifiée',
    desc: 'Avant ou après une absence prévue (maladie, convocation…), cliquez "Déclarer une absence", remplissez le formulaire et joignez un justificatif. L\'administration reçoit une notification.',
  },
  {
    step: '4',
    color: '#7c3aed', bg: '#ede9fe',
    title: 'Validation par l\'administration',
    desc: 'L\'admin examine votre demande et l\'approuve ou la refuse. Vous recevez une notification du résultat. Si approuvée, vos absences sur la période passent en statut "Excusé".',
  },
  {
    step: '5',
    color: '#dc2626', bg: '#fee2e2',
    title: 'Seuil d\'alerte : 20%',
    desc: 'Si votre taux d\'absences dépasse 20%, l\'administration reçoit une alerte. Un entretien ou une convocation peut être demandé. Pensez à régulariser vos absences.',
  },
];

function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="h-8 w-8 rounded-full border-[3px] animate-spin"
           style={{ borderColor: CB, borderTopColor: CA }} />
      <p className="text-sm" style={{ color: '#64748b' }}>Chargement…</p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
export default function StudentPresences() {
  const [filterStatus, setFilterStatus] = useState('all');
  const [showDeclarForm, setShowDeclarForm] = useState(false);
  const [showWorkflow, setShowWorkflow]     = useState(false);
  const [showRequests, setShowRequests]     = useState(true);
  const [submitting, setSubmitting]         = useState(false);
  const [formError, setFormError]           = useState('');
  const [form, setForm] = useState({ start_date: '', end_date: '', reason: '', attachment: null });

  /* ── data ── */
  const { data: profile, loading: loadProfile } = useApi(
    () => studentsService.getMe(), [], true
  );
  const studentId = profile?.id;

  const { data: recordsData, loading: loadRecords, execute: refreshRecords } = useApi(
    () => studentId
      ? attendanceService.getRecords({ student: studentId, page_size: 200 })
      : Promise.resolve([]),
    [studentId], !!studentId
  );

  const { data: reqData, loading: loadReqs, execute: refreshReqs } = useApi(
    () => studentId
      ? attendanceService.getAbsenceRequests({ student: studentId, is_active: true })
      : Promise.resolve([]),
    [studentId], !!studentId
  );

  const records  = Array.isArray(recordsData) ? recordsData : (recordsData?.results || []);
  const requests = Array.isArray(reqData)     ? reqData     : (reqData?.results     || []);

  const filtered = filterStatus === 'all' ? records : records.filter(r => r.status === filterStatus);

  const counts = {
    PRESENT: records.filter(r => r.status === 'PRESENT').length,
    ABSENT:  records.filter(r => r.status === 'ABSENT').length,
    LATE:    records.filter(r => r.status === 'LATE').length,
    EXCUSED: records.filter(r => r.status === 'EXCUSED').length,
  };
  const total = records.length;
  const presencePct = total > 0 ? Math.round((counts.PRESENT / total) * 100) : 0;

  /* ── Submit declaration ── */
  async function submitRequest(e) {
    e.preventDefault();
    setFormError('');
    if (!form.start_date || !form.end_date || !form.reason.trim()) {
      setFormError('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    if (form.start_date > form.end_date) {
      setFormError('La date de fin doit être après la date de début.');
      return;
    }
    setSubmitting(true);
    try {
      await attendanceService.createAbsenceRequest({
        student: studentId,
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason,
        attachment: form.attachment || undefined,
      });
      setForm({ start_date: '', end_date: '', reason: '', attachment: null });
      setShowDeclarForm(false);
      setShowRequests(true);
      refreshReqs();
    } catch {
      setFormError('Erreur lors de l\'envoi. Veuillez réessayer.');
    }
    setSubmitting(false);
  }

  if (loadProfile) return <Spinner />;

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold" style={{ color: '#0f172a' }}>Mes présences</h1>
          <p className="text-sm" style={{ color: '#64748b' }}>Suivi de votre assiduité</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowWorkflow(p => !p)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}>
            <Info className="h-3.5 w-3.5" /> Comment ça marche ?
          </button>
          <button onClick={() => { refreshRecords(); refreshReqs(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
            style={{ background: '#f1f5f9', color: '#64748b' }}>
            <RefreshCw className="h-3.5 w-3.5" /> Actualiser
          </button>
          {/* PRIMARY: always-visible declaration button */}
          <button onClick={() => { setShowDeclarForm(p => !p); setShowRequests(true); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-sm"
            style={{ background: showDeclarForm ? '#64748b' : `linear-gradient(135deg, ${CA}, ${CA}cc)` }}>
            {showDeclarForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showDeclarForm ? 'Annuler' : 'Déclarer une absence'}
          </button>
        </div>
      </div>

      {/* ── Workflow explanation panel ── */}
      {showWorkflow && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold" style={{ color: '#0f172a' }}>
              Workflow — Comment fonctionne le suivi des présences ?
            </h3>
            <button onClick={() => setShowWorkflow(false)}>
              <X className="h-4 w-4" style={{ color: '#94a3b8' }} />
            </button>
          </div>
          <div className="space-y-3">
            {WORKFLOW.map((w, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-xl"
                   style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0 text-white"
                     style={{ background: w.color }}>
                  {w.step}
                </div>
                <div>
                  <p className="text-xs font-extrabold mb-0.5" style={{ color: '#0f172a' }}>{w.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>{w.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] italic" style={{ color: '#94a3b8' }}>
            En cas de problème ou d'incompréhension, contactez directement l'administration.
          </p>
        </div>
      )}

      {/* ── Declaration form (inline, not modal) ── */}
      {showDeclarForm && (
        <div className="card p-5 space-y-4" style={{ border: `2px solid ${CA}30` }}>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: CB }}>
              <FileText className="h-5 w-5" style={{ color: CA }} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold" style={{ color: '#0f172a' }}>
                Déclarer une absence justifiée
              </h3>
              <p className="text-xs" style={{ color: '#64748b' }}>
                Remplissez ce formulaire pour signaler une absence prévue ou récente.
                L'administration sera notifiée et pourra valider votre demande.
              </p>
            </div>
          </div>

          <form onSubmit={submitRequest} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: '#64748b' }}>
                  Date de début <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input type="date" required value={form.start_date}
                  onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                  className="input-field w-full text-xs" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: '#64748b' }}>
                  Date de fin <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input type="date" required value={form.end_date}
                  onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
                  className="input-field w-full text-xs" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: '#64748b' }}>
                Motif de l'absence <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea required value={form.reason} rows={3}
                onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                placeholder="Ex : maladie avec certificat médical, convocation officielle, événement familial…"
                className="input-field w-full text-xs resize-none" />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: '#64748b' }}>
                Justificatif — photo ou PDF (optionnel mais recommandé)
              </label>
              <label className="relative flex flex-col items-center justify-center gap-2 rounded-2xl cursor-pointer transition-all"
                     style={{
                       border: form.attachment ? '2px solid #059669' : '2px dashed #cbd5e1',
                       background: form.attachment ? '#f0fdf4' : '#f8fafc',
                       padding: '1.25rem',
                     }}
                     onDragOver={e => e.preventDefault()}
                     onDrop={e => {
                       e.preventDefault();
                       const file = e.dataTransfer.files?.[0];
                       if (file) setForm(p => ({ ...p, attachment: file }));
                     }}>
                <input type="file" accept="image/*,.pdf" className="sr-only"
                  onChange={e => setForm(p => ({ ...p, attachment: e.target.files?.[0] || null }))} />

                {form.attachment ? (
                  <>
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center"
                         style={{ background: '#d1fae5' }}>
                      <Paperclip className="h-5 w-5" style={{ color: '#059669' }} />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold" style={{ color: '#059669' }}>
                        ✓ Fichier sélectionné
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: '#64748b' }}>
                        {form.attachment.name}
                      </p>
                    </div>
                    <button type="button"
                      onClick={e => { e.preventDefault(); setForm(p => ({ ...p, attachment: null })); }}
                      className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg"
                      style={{ background: '#fee2e2', color: '#ef4444' }}>
                      <X className="h-3 w-3" /> Supprimer
                    </button>
                  </>
                ) : (
                  <>
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center"
                         style={{ background: '#e0e7ff' }}>
                      <Upload className="h-5 w-5" style={{ color: '#6366f1' }} />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold" style={{ color: '#1e293b' }}>
                        Cliquez ou glissez-déposez un fichier
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: '#94a3b8' }}>
                        PNG, JPG, PDF — max 10 Mo
                      </p>
                    </div>
                  </>
                )}
              </label>
            </div>

            {formError && (
              <div className="p-3 rounded-xl text-xs font-semibold"
                   style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca' }}>
                {formError}
              </div>
            )}

            {/* Info box */}
            <div className="flex items-start gap-2 p-3 rounded-xl text-xs" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: '#059669' }} />
              <span style={{ color: '#065f46' }}>
                Après envoi, l'administration reçoit une notification et traitera votre demande.
                Vous serez notifié(e) du résultat. Si approuvée, vos absences sur la période seront classées "Excusé".
              </span>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button type="button" onClick={() => setShowDeclarForm(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: '#f1f5f9', color: '#64748b' }}>
                Annuler
              </button>
              <button type="submit" disabled={submitting}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ background: CA }}>
                {submitting
                  ? <div className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  : <Send className="h-4 w-4" />}
                Soumettre la demande
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Stats cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Object.entries(STATUS_MAP).map(([key, s]) => (
          <div key={key} className="card p-4 text-center cursor-pointer transition-all"
               style={{ border: filterStatus === key ? `2px solid ${s.color}` : `1.5px solid ${s.color}20` }}
               onClick={() => setFilterStatus(filterStatus === key ? 'all' : key)}>
            <div className="h-10 w-10 rounded-xl flex items-center justify-center mx-auto mb-2"
                 style={{ background: s.bg }}>
              <s.icon className="h-5 w-5" style={{ color: s.color }} />
            </div>
            <p className="text-2xl font-extrabold" style={{ color: s.color }}>{counts[key]}</p>
            <p className="text-[11px] font-semibold" style={{ color: '#94a3b8' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Presence rate ── */}
      {total > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-extrabold" style={{ color: '#0f172a' }}>Taux de présence</p>
            <p className="text-sm font-extrabold"
               style={{ color: presencePct >= 80 ? '#059669' : presencePct >= 60 ? '#d97706' : '#dc2626' }}>
              {presencePct}%
            </p>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: '#f1f5f9' }}>
            <div className="h-full rounded-full transition-all"
                 style={{
                   width: `${presencePct}%`,
                   background: presencePct >= 80
                     ? 'linear-gradient(90deg,#059669,#34d399)'
                     : presencePct >= 60
                       ? 'linear-gradient(90deg,#d97706,#fbbf24)'
                       : 'linear-gradient(90deg,#dc2626,#f87171)',
                 }} />
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs" style={{ color: '#94a3b8' }}>
              {counts.PRESENT} présence{counts.PRESENT > 1 ? 's' : ''} sur {total} séances
            </p>
            <p className="text-[10px] font-semibold" style={{ color: presencePct >= 80 ? '#059669' : '#d97706' }}>
              Seuil recommandé : 80%
            </p>
          </div>
          {presencePct < 80 && total >= 3 && (
            <div className="mt-3 flex items-start gap-2 p-3 rounded-xl text-xs"
                 style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: '#ea580c' }} />
              <span style={{ color: '#9a3412' }}>
                Votre taux de présence est en dessous du seuil de 80%.
                Pensez à <button onClick={() => setShowDeclarForm(true)}
                  className="underline font-bold" style={{ color: CA }}>
                  déclarer vos absences justifiées
                </button> pour régulariser votre situation.
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Filter pills ── */}
      <div className="flex gap-2 flex-wrap">
        {[{ id: 'all', label: 'Tout' }, ...Object.entries(STATUS_MAP).map(([k, v]) => ({ id: k, label: v.label }))].map(f => (
          <button key={f.id} onClick={() => setFilterStatus(f.id)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={filterStatus === f.id
              ? { background: CA, color: '#fff' }
              : { background: '#f8fafc', color: '#64748b', border: '1.5px solid #f1f5f9' }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Records table ── */}
      {loadRecords ? <Spinner /> :
       filtered.length === 0 ? (
         <div className="card flex flex-col items-center justify-center py-16 gap-4">
           <div className="h-16 w-16 rounded-2xl flex items-center justify-center" style={{ background: CB }}>
             <CheckSquare className="h-8 w-8" style={{ color: CA }} />
           </div>
           <p className="text-sm font-semibold" style={{ color: '#475569' }}>
             {filterStatus !== 'all' ? 'Aucune séance avec ce statut' : 'Aucune donnée de présence enregistrée'}
           </p>
           <p className="text-xs text-center max-w-xs" style={{ color: '#94a3b8' }}>
             Les présences sont marquées par l'administration après chaque séance de cours.
           </p>
         </div>
       ) : (
         <div className="card overflow-hidden">
           <div className="overflow-x-auto">
             <table className="w-full">
               <thead>
                 <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                   {['Date', 'Cours / Séance', 'Statut', 'Commentaire'].map(h => (
                     <th key={h} className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider"
                         style={{ color: '#94a3b8' }}>{h}</th>
                   ))}
                 </tr>
               </thead>
               <tbody>
                 {filtered.map((r, i) => {
                   const s = STATUS_MAP[r.status] || STATUS_MAP.ABSENT;
                   return (
                     <tr key={r.id}
                         style={{ borderBottom: '1px solid #f8fafc', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                       <td className="px-4 py-3 text-xs font-semibold" style={{ color: '#1e293b' }}>
                         {r.created_at ? new Date(r.created_at).toLocaleDateString('fr-FR') : '—'}
                       </td>
                       <td className="px-4 py-3 text-xs font-semibold" style={{ color: '#1e293b' }}>
                         {r.subject_name || '—'}
                       </td>
                       <td className="px-4 py-3">
                         <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full"
                               style={{ background: s.bg, color: s.color }}>
                           <s.icon className="h-3 w-3" />{s.label}
                         </span>
                       </td>
                       <td className="px-4 py-3 text-xs" style={{ color: '#94a3b8' }}>
                         {r.notes || '—'}
                       </td>
                     </tr>
                   );
                 })}
               </tbody>
             </table>
           </div>
         </div>
       )
      }

      {/* ── Mes demandes d'absence (section toujours visible) ── */}
      <div className="card overflow-hidden">
        {/* Section header (collapsible) */}
        <button
          onClick={() => setShowRequests(p => !p)}
          className="w-full flex items-center justify-between px-5 py-4"
          style={{ borderBottom: showRequests ? '1px solid #f1f5f9' : 'none' }}>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center"
                 style={{ background: CB }}>
              <FileText className="h-4 w-4" style={{ color: CA }} />
            </div>
            <div className="text-left">
              <p className="text-sm font-extrabold" style={{ color: '#0f172a' }}>
                Mes demandes d'absence
              </p>
              <p className="text-xs" style={{ color: '#94a3b8' }}>
                {requests.length} demande{requests.length > 1 ? 's' : ''} soumise{requests.length > 1 ? 's' : ''}
                {requests.filter(r => r.status === 'PENDING').length > 0 &&
                  ` · ${requests.filter(r => r.status === 'PENDING').length} en attente`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={e => { e.stopPropagation(); setShowDeclarForm(p => !p); setShowRequests(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white"
              style={{ background: CA }}>
              <Plus className="h-3.5 w-3.5" /> Nouvelle demande
            </button>
            {showRequests
              ? <ChevronUp className="h-4 w-4" style={{ color: '#94a3b8' }} />
              : <ChevronDown className="h-4 w-4" style={{ color: '#94a3b8' }} />}
          </div>
        </button>

        {showRequests && (
          <div className="p-4">
            {loadReqs ? <Spinner /> :
             requests.length === 0 ? (
               <div className="flex flex-col items-center py-10 gap-3">
                 <FileText className="h-10 w-10 opacity-20" style={{ color: '#64748b' }} />
                 <p className="text-sm font-semibold" style={{ color: '#475569' }}>
                   Aucune demande d'absence
                 </p>
                 <p className="text-xs text-center max-w-sm" style={{ color: '#94a3b8' }}>
                   Utilisez "Déclarer une absence" (bouton en haut à droite) pour signaler
                   une absence prévue ou récente à l'administration.
                 </p>
                 <button onClick={() => setShowDeclarForm(true)}
                   className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white mt-2"
                   style={{ background: CA }}>
                   <Plus className="h-4 w-4" /> Déclarer une absence
                 </button>
               </div>
             ) : (
               <div className="space-y-3">
                 {requests.map(req => {
                   const rs = REQ_STATUS[req.status] || REQ_STATUS.PENDING;
                   return (
                     <div key={req.id} className="p-4 rounded-xl"
                          style={{ background: '#f8fafc', border: `1.5px solid ${rs.color}20` }}>
                       <div className="flex items-start justify-between gap-3 mb-2">
                         <div>
                           <p className="text-sm font-extrabold" style={{ color: '#0f172a' }}>
                             {fmtDate(req.start_date)}
                             {req.start_date !== req.end_date && ` → ${fmtDate(req.end_date)}`}
                           </p>
                           <p className="text-xs mt-0.5 line-clamp-2" style={{ color: '#64748b' }}>
                             {req.reason}
                           </p>
                         </div>
                         <span className="text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                               style={{ background: rs.bg, color: rs.color }}>{rs.label}</span>
                       </div>

                       {req.status === 'REJECTED' && req.review_notes && (
                         <div className="p-2.5 rounded-xl text-xs mb-2"
                              style={{ background: '#fff1f2', border: '1px solid #fecdd3' }}>
                           <span className="font-bold" style={{ color: '#ef4444' }}>Motif du refus : </span>
                           <span style={{ color: '#1e293b' }}>{req.review_notes}</span>
                         </div>
                       )}

                       <div className="flex items-center gap-3 text-xs" style={{ color: '#94a3b8' }}>
                         <span>Soumis le {fmtDate(req.submitted_at)}</span>
                         {req.attachment_url && (
                           <a href={req.attachment_url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 hover:underline font-semibold"
                              style={{ color: CA }}>
                             <FileText className="h-3 w-3" /> Justificatif
                           </a>
                         )}
                         {req.reviewed_by_name && (
                           <span>· Traité par {req.reviewed_by_name}</span>
                         )}
                       </div>
                     </div>
                   );
                 })}
               </div>
             )
            }
          </div>
        )}
      </div>

    </div>
  );
}
