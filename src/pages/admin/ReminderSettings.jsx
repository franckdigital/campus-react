import { useState } from 'react';
import { createPortal } from 'react-dom';
import { BellRing, Plus, Edit, Trash2, X, AlertTriangle, Send, CalendarClock, GraduationCap } from 'lucide-react';
import { remindersService, sitesService, academicService } from '../../services';
import { useApi } from '../../hooks/useApi';
import { useNotifications } from '../../components/Notifications';
import { PageHeader, FilterBar, FilterSelect, PrimaryButton, IconBtn } from '../../components/ui/PageHeader';
import BackToParametres from '../../components/ui/BackToParametres';

const COLOR = '#e11d48';

const TYPES = [
  { value: 'ECHEANCIER', label: 'Échéancier' },
  { value: 'EXAMEN',      label: 'Examen' },
];

const emptyForm = {
  reminder_type: '',
  label: '',
  is_automatic: true,
  is_active: true,
  site: '',
  program: '',
  level: '',
  echeancier_start_day: '',
  echeancier_frequency_days: '',
  echeancier_deadline_date: '',
  exam_type: '',
  exam_date: '',
  exam_reminder_frequency_days: '',
};

function scopeLabel(r) {
  return [r.site_name, r.program_name, r.level_name].filter(Boolean).join(' · ') || 'Tous les étudiants';
}

function summarize(r) {
  if (r.reminder_type === 'ECHEANCIER') {
    const parts = [`démarre le ${r.echeancier_start_day} du mois`, `tous les ${r.echeancier_frequency_days}j`];
    if (r.echeancier_deadline_date) parts.push(`jusqu'au ${r.echeancier_deadline_date}`);
    return parts.join(' · ');
  }
  return `${r.exam_type || 'Examen'} · ${r.exam_date || '—'} · tous les ${r.exam_reminder_frequency_days || '?'}j`;
}

function ConfirmModal({
  title, message, onConfirm, onCancel,
  icon: Icon = AlertTriangle, iconColor = '#ef4444', iconBg = '#fef2f2',
  confirmLabel = 'Confirmer', confirmColor = '#ef4444', confirming = false, confirmingLabel = 'Patientez…',
}) {
  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', zIndex: 9999 }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-[fadeInUp_.18s_ease-out]" style={{ background: '#fff', border: '1.5px solid #f0f4f9' }}>
        <div className="flex items-start gap-3.5 mb-5">
          <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
            <Icon size={20} color={iconColor} />
          </div>
          <div className="pt-1">
            {title && <p className="text-sm font-bold text-slate-800 mb-1">{title}</p>}
            <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} disabled={confirming}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
            Annuler
          </button>
          <button onClick={onConfirm} disabled={confirming}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-60 min-w-[110px]"
            style={{ background: confirmColor }}>
            {confirming ? confirmingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ReminderModal({ editing, sites, programs, levels, onClose, onSaved }) {
  const { notify } = useNotifications();
  const [form, setForm] = useState(editing ? {
    reminder_type: editing.reminder_type,
    label: editing.label || '',
    is_automatic: editing.is_automatic,
    is_active: editing.is_active,
    site: editing.site ?? '',
    program: editing.program ?? '',
    level: editing.level ?? '',
    echeancier_start_day: editing.echeancier_start_day ?? '',
    echeancier_frequency_days: editing.echeancier_frequency_days ?? '',
    echeancier_deadline_date: editing.echeancier_deadline_date || '',
    exam_type: editing.exam_type || '',
    exam_date: editing.exam_date || '',
    exam_reminder_frequency_days: editing.exam_reminder_frequency_days ?? '',
  } : { ...emptyForm });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.reminder_type) {
      notify('Choisissez un type (Échéancier ou Examen)', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        reminder_type: form.reminder_type,
        label: form.label,
        is_automatic: form.is_automatic,
        is_active: form.is_active,
        site: form.site || null,
        program: form.program || null,
        level: form.level || null,
        echeancier_start_day: form.reminder_type === 'ECHEANCIER' ? (parseInt(form.echeancier_start_day, 10) || null) : null,
        echeancier_frequency_days: form.reminder_type === 'ECHEANCIER' ? (parseInt(form.echeancier_frequency_days, 10) || null) : null,
        echeancier_deadline_date: form.reminder_type === 'ECHEANCIER' ? (form.echeancier_deadline_date || null) : null,
        exam_type: form.reminder_type === 'EXAMEN' ? form.exam_type : '',
        exam_date: form.reminder_type === 'EXAMEN' ? (form.exam_date || null) : null,
        exam_reminder_frequency_days: form.reminder_type === 'EXAMEN' ? (parseInt(form.exam_reminder_frequency_days, 10) || null) : null,
      };
      if (editing) {
        await remindersService.update(editing.id, payload);
        notify('Configuration mise à jour', 'success');
      } else {
        await remindersService.create(payload);
        notify('Configuration créée', 'success');
      }
      onSaved();
    } catch (err) {
      notify(err.message || 'Erreur lors de la sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', zIndex: 9999 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      {/* max-h + overflow-y-auto so the form scrolls within the viewport
          instead of being clipped off-screen — stacking the périmètre
          fields vertically (readability fix) made this taller than some
          viewports, and overflow-hidden here had no scroll fallback at all. */}
      <div className="rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ background: '#fff', border: '1.5px solid #e2e8f0' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ background: `linear-gradient(135deg, ${COLOR}, #be123c)` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <BellRing size={18} color="#fff" />
            </div>
            <h2 className="text-base font-bold text-white">{editing ? 'Modifier le rappel' : 'Nouveau rappel'}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-white hover:bg-white/20 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type — verrouillé en édition : change les champs requis et la
              logique d'envoi (echeancier vs examen), donc pas de conversion
              d'une config existante en un autre type. */}
          <div>
            <label className="block text-xs font-bold mb-1.5 text-slate-500">Type de rappel *</label>
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map(t => (
                <button key={t.value} type="button"
                  disabled={!!editing}
                  onClick={() => set('reminder_type', t.value)}
                  className="py-2.5 rounded-xl text-sm font-bold border-2 transition-all"
                  style={{
                    ...(form.reminder_type === t.value
                      ? { borderColor: COLOR, background: '#fff1f2', color: COLOR }
                      : { borderColor: '#e2e8f0', color: '#94a3b8' }),
                    ...(editing ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
                  }}>
                  {t.label}
                </button>
              ))}
            </div>
            {editing && (
              <p className="text-[11px] mt-1.5 text-slate-400">
                Le type ne peut pas être modifié après création — créez un nouveau rappel pour l'autre type.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5 text-slate-500">Libellé (optionnel)</label>
            <input className="input-field" placeholder="ex: Rappel scolarité Licence 1"
              value={form.label} onChange={e => set('label', e.target.value)} />
          </div>

          {/* Périmètre — laisser vide = "tous" pour cette dimension. Un
              rappel scopé (ex: Site A + Licence Info) coexiste avec un
              rappel global sans conflit ; le plus spécifique gagne pour
              l'échéancier, et pour l'examen chaque config scopée cible
              uniquement les étudiants qui correspondent. */}
          <div>
            <label className="block text-xs font-bold mb-1.5 text-slate-500">Périmètre (optionnel — vide = tous)</label>
            {/* One per row instead of 3-across — crammed into a third of the
                modal's width, long names like "Licence 1 Gestion Commerciale"
                got clipped by the native <select> with no way to tell Site
                from Programme from Niveau apart at a glance. A small label
                above each + full width fixes both the truncation and the
                ambiguity; title= is a fallback for any name still long
                enough to clip on a narrow viewport. */}
            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-semibold mb-1 text-slate-400">Site</label>
                <select className="input-field w-full" value={form.site} onChange={e => set('site', e.target.value)}
                  title={sites.find(s => s.id === form.site)?.name || 'Tous les sites'}>
                  <option value="">Tous les sites</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1 text-slate-400">Programme</label>
                <select className="input-field w-full" value={form.program} onChange={e => set('program', e.target.value)}
                  title={programs.find(p => p.id === form.program)?.name || 'Tous les programmes'}>
                  <option value="">Tous les programmes</option>
                  {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1 text-slate-400">Niveau</label>
                <select className="input-field w-full" value={form.level} onChange={e => set('level', e.target.value)}
                  title={levels.find(l => l.id === form.level)?.name || 'Tous les niveaux'}>
                  <option value="">Tous les niveaux</option>
                  {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {form.reminder_type === 'ECHEANCIER' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-500">Jour de démarrage (1-31) *</label>
                <input type="number" min="1" max="31" className="input-field" placeholder="ex: 25" required
                  value={form.echeancier_start_day} onChange={e => set('echeancier_start_day', e.target.value)} onWheel={e => e.target.blur()} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-500">Fréquence de rappel (jours) *</label>
                <input type="number" min="1" className="input-field" placeholder="ex: 3" required
                  value={form.echeancier_frequency_days} onChange={e => set('echeancier_frequency_days', e.target.value)} onWheel={e => e.target.blur()} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold mb-1.5 text-slate-500">Délai limite (optionnel)</label>
                <input type="date" className="input-field"
                  value={form.echeancier_deadline_date} onChange={e => set('echeancier_deadline_date', e.target.value)} />
                <p className="text-[11px] mt-1 text-slate-400">Les rappels automatiques s'arrêtent après cette date.</p>
              </div>
            </div>
          )}

          {form.reminder_type === 'EXAMEN' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold mb-1.5 text-slate-500">Type d'examen *</label>
                <input className="input-field" placeholder="ex: Examen final" required list="exam-type-suggestions"
                  value={form.exam_type} onChange={e => set('exam_type', e.target.value)} />
                <datalist id="exam-type-suggestions">
                  <option value="Examen final" />
                  <option value="Contrôle continu" />
                  <option value="Rattrapage" />
                  <option value="Oral" />
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-500">Date de l'examen *</label>
                <input type="date" className="input-field" required
                  value={form.exam_date} onChange={e => set('exam_date', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-500">Fréquence de rappel (jours) *</label>
                <input type="number" min="1" className="input-field" placeholder="ex: 2" required
                  value={form.exam_reminder_frequency_days} onChange={e => set('exam_reminder_frequency_days', e.target.value)} onWheel={e => e.target.blur()} />
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={form.is_automatic} onChange={e => set('is_automatic', e.target.checked)}
              className="w-4 h-4 rounded" style={{ accentColor: COLOR }} />
            <span className="text-sm text-slate-600 font-medium">Envoi automatique</span>
          </label>
          <p className="text-[11px] -mt-2 text-slate-400 pl-6">
            Si désactivé, ce rappel ne part jamais tout seul — utilisez "Envoyer maintenant" pour le déclencher manuellement.
          </p>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)}
              className="w-4 h-4 rounded" style={{ accentColor: COLOR }} />
            <span className="text-sm text-slate-600 font-medium">Actif</span>
          </label>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${COLOR}, #be123c)`, boxShadow: '0 3px 10px rgba(225,29,72,0.3)' }}>
              {saving ? 'Enregistrement…' : (editing ? 'Mettre à jour' : 'Créer le rappel')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default function ReminderSettingsPage() {
  const { notify } = useNotifications();
  const [filterType, setFilterType] = useState('');
  const [filterSite, setFilterSite] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmSend, setConfirmSend] = useState(null);
  const [sendingId, setSendingId] = useState(null);

  const { data, loading, error, execute: reload } = useApi(
    () => remindersService.getAll({
      ...(filterType ? { reminder_type: filterType } : {}),
      ...(filterSite ? { site: filterSite } : {}),
      page_size: 100,
    }),
    [filterType, filterSite],
    true
  );

  const { data: sitesData }    = useApi(() => sitesService.getSites({ is_active: true, page_size: 100 }), [], true);
  const { data: levelsData }   = useApi(() => academicService.getLevels({ is_active: true, page_size: 100 }), [], true);
  const { data: programsData } = useApi(() => academicService.getPrograms({ is_active: true, page_size: 100 }), [], true);

  const dedupByName = (arr) => {
    const seen = new Set();
    return (arr || []).filter(x => { if (seen.has(x.name)) return false; seen.add(x.name); return true; });
  };

  const sites    = dedupByName(sitesData?.results    || sitesData);
  const levels   = dedupByName(levelsData?.results   || levelsData);
  const programs = dedupByName(programsData?.results || programsData);

  const reminders = data?.results || data || [];

  const handleToggleActive = async (r) => {
    try {
      await remindersService.update(r.id, { is_active: !r.is_active });
      reload();
    } catch (err) {
      notify(err.message || 'Erreur lors de la mise à jour', 'error');
    }
  };

  const handleToggleAutomatic = async (r) => {
    try {
      await remindersService.update(r.id, { is_automatic: !r.is_automatic });
      notify(
        r.is_automatic
          ? 'Rappel passé en manuel — utilisez "Envoyer maintenant" pour le déclencher ponctuellement'
          : 'Rappel passé en automatique — il sera envoyé chaque jour selon sa fréquence',
        'success'
      );
      reload();
    } catch (err) {
      notify(err.message || 'Erreur lors de la mise à jour', 'error');
    }
  };

  const handleSendNow = async () => {
    const r = confirmSend;
    if (!r) return;
    setSendingId(r.id);
    try {
      const res = await remindersService.sendNow(r.id);
      notify(res?.detail || 'Rappel envoyé', 'success');
    } catch (err) {
      notify(err.message || 'Erreur lors de l\'envoi', 'error');
    } finally {
      setSendingId(null);
      setConfirmSend(null);
    }
  };

  const handleDelete = async () => {
    try {
      await remindersService.remove(confirmDelete.id);
      notify('Rappel supprimé', 'success');
      reload();
    } catch (err) {
      notify(err.message || 'Erreur lors de la suppression', 'error');
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <BackToParametres />
      <PageHeader
        icon={BellRing}
        iconColor={COLOR}
        iconBg="#fff1f2"
        title="Alertes & Rappels"
        subtitle="Rappels automatiques et manuels — échéancier de scolarité et examens"
        action={
          <PrimaryButton icon={Plus} label="Nouveau rappel" onClick={() => { setEditItem(null); setShowModal(true); }} color={COLOR} />
        }
      />

      <FilterBar>
        <FilterSelect value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">Tous les types</option>
          {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </FilterSelect>
        <FilterSelect value={filterSite} onChange={e => setFilterSite(e.target.value)}>
          <option value="">Tous les sites</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </FilterSelect>
      </FilterBar>

      <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: '#fff1f2', border: '1px solid #fecdd3' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: COLOR }}>
          <BellRing size={16} color="#fff" />
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: '#be123c' }}>Comment ça marche</p>
          <p className="text-xs mt-0.5" style={{ color: '#be123c', opacity: 0.85 }}>
            Un rappel <strong>Échéancier</strong> notifie les étudiants (et parents) en retard sur leur échéancier de scolarité.
            Un rappel <strong>Examen</strong> notifie les étudiants à l'approche d'un examen.
            Laissez le <strong>périmètre</strong> vide pour cibler tous les étudiants, ou restreignez-le à un site/programme/niveau —
            le rappel le plus spécifique s'applique à chaque étudiant. Les rappels automatiques partent chaque jour selon leur
            fréquence ; "Envoyer maintenant" force un envoi immédiat. Les notifications arrivent aussi en push sur le téléphone
            même si l'étudiant est déconnecté de l'application.
          </p>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden shadow-sm" style={{ border: '1px solid #e2e8f0' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)' }}>
                {['Type', 'Libellé', 'Périmètre', 'Détails', 'Automatique', 'Statut', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="py-12 text-center text-slate-400 text-sm">Chargement…</td></tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={7} className="py-8 text-center">
                    <p className="text-sm font-medium text-red-500">Erreur : {error}</p>
                    <button onClick={reload} className="mt-2 text-xs text-rose-600 underline">Réessayer</button>
                  </td>
                </tr>
              )}
              {!loading && !error && reminders.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#fff1f2' }}>
                        <BellRing size={24} color={COLOR} />
                      </div>
                      <p className="text-sm font-medium text-slate-500">Aucun rappel configuré</p>
                      <p className="text-xs text-slate-400">Cliquez sur "Nouveau rappel" pour commencer</p>
                    </div>
                  </td>
                </tr>
              )}
              {reminders.map((r, i) => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors"
                  style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap inline-flex items-center gap-1.5"
                      style={r.reminder_type === 'ECHEANCIER'
                        ? { background: '#dbeafe', color: '#1d4ed8' }
                        : { background: '#ede9fe', color: '#6d28d9' }}>
                      {r.reminder_type === 'ECHEANCIER' ? <CalendarClock size={12} /> : <GraduationCap size={12} />}
                      {r.reminder_type_display || (r.reminder_type === 'ECHEANCIER' ? 'Échéancier' : 'Examen')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800 truncate w-[180px]" title={r.label || ''}>{r.label || '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <div className="truncate w-[160px]" title={scopeLabel(r)}>
                      {r.site_name || r.program_name || r.level_name
                        ? scopeLabel(r)
                        : <span className="text-slate-300 italic">Tous</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <div className="truncate w-[240px]" title={summarize(r)}>{summarize(r)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggleAutomatic(r)}
                      title={r.is_automatic ? 'Cliquer pour passer en manuel' : 'Cliquer pour activer l\'envoi automatique'}
                      className="px-2.5 py-1 rounded-full text-xs font-bold transition-colors"
                      style={r.is_automatic ? { background: '#f0fdf4', color: '#16a34a' } : { background: '#f8fafc', color: '#94a3b8' }}>
                      {r.is_automatic ? 'Auto' : 'Manuel'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggleActive(r)}
                      className="px-2.5 py-1 rounded-full text-xs font-bold transition-colors"
                      style={r.is_active ? { background: '#f0fdf4', color: '#16a34a' } : { background: '#f8fafc', color: '#94a3b8' }}>
                      {r.is_active ? 'Actif' : 'Inactif'}
                    </button>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex gap-1.5">
                      <IconBtn icon={Send} onClick={() => setConfirmSend(r)} color="#059669" title={sendingId === r.id ? 'Envoi…' : 'Envoyer maintenant'} />
                      <IconBtn icon={Edit} onClick={() => { setEditItem(r); setShowModal(true); }} color={COLOR} title="Modifier" />
                      <IconBtn icon={Trash2} onClick={() => setConfirmDelete(r)} color="#ef4444" title="Supprimer" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <ReminderModal
          editing={editItem}
          sites={sites}
          programs={programs}
          levels={levels}
          onClose={() => { setShowModal(false); setEditItem(null); }}
          onSaved={() => { setShowModal(false); setEditItem(null); reload(); }}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Supprimer ce rappel ?"
          message={`"${confirmDelete.label || confirmDelete.reminder_type_display || confirmDelete.reminder_type}" sera définitivement supprimé.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
          confirmLabel="Supprimer"
        />
      )}

      {confirmSend && (
        <ConfirmModal
          title="Envoyer ce rappel maintenant ?"
          message={`"${confirmSend.label || confirmSend.reminder_type_display || confirmSend.reminder_type}" sera envoyé immédiatement à tous les étudiants actifs concernés (et leurs parents), en plus de son envoi automatique habituel.`}
          onConfirm={handleSendNow}
          onCancel={() => setConfirmSend(null)}
          icon={Send}
          iconColor="#059669"
          iconBg="#f0fdf4"
          confirmLabel="Envoyer maintenant"
          confirmColor="#059669"
          confirming={sendingId === confirmSend.id}
          confirmingLabel="Envoi…"
        />
      )}
    </div>
  );
}
