import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Bot, Plus, Edit, Trash2, X, AlertTriangle, ChevronUp, ChevronDown, ToggleLeft, ToggleRight } from 'lucide-react';
import { landingService } from '../../services';
import { useApi } from '../../hooks/useApi';
import { useNotifications } from '../../components/Notifications';
import { PageHeader, PrimaryButton, IconBtn } from '../../components/ui/PageHeader';

const COLOR = '#ea580c'; const COLOR_BG = '#fff7ed'; const COLOR_ICON = '#fed7aa';

const emptyForm = { keyword: '', question_example: '', response: '', priority: 0, is_active: true };

function ConfirmModal({ message, onConfirm, onCancel }) {
  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', zIndex: 9999 }}>
      <div className="rounded-2xl p-6 w-full max-w-sm shadow-2xl" style={{ background: '#fff', border: '1.5px solid #f0f4f9' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#fef2f2' }}>
            <AlertTriangle size={20} color="#ef4444" />
          </div>
          <p className="text-sm font-medium text-slate-700">{message}</p>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">Annuler</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-colors" style={{ background: '#ef4444' }}>Confirmer</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function AIResponseModal({ editing, onClose, onSaved }) {
  const { notify } = useNotifications();
  const [form, setForm] = useState(editing ? {
    keyword: editing.keyword, question_example: editing.question_example || '',
    response: editing.response, priority: editing.priority ?? 0, is_active: editing.is_active ?? true,
  } : emptyForm);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        keyword: form.keyword.trim(),
        question_example: form.question_example,
        response: form.response,
        priority: parseInt(form.priority, 10) || 0,
        is_active: form.is_active,
      };
      if (editing) {
        await landingService.updateAIResponse(editing.id, payload);
        notify('Réponse mise à jour', 'success');
      } else {
        await landingService.createAIResponse(payload);
        notify('Réponse créée', 'success');
      }
      onSaved();
    } catch (err) {
      notify(err?.response?.data?.detail || 'Erreur lors de la sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', zIndex: 9999 }}>
      <div className="rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" style={{ background: '#fff', border: '1.5px solid #e2e8f0' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ background: `linear-gradient(135deg, ${COLOR}, #c2410c)` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <Bot size={18} color="#fff" />
            </div>
            <h2 className="text-base font-bold text-white">{editing ? 'Modifier la réponse' : 'Nouvelle réponse'}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-white hover:bg-white/20 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold mb-1.5 text-slate-500">Mot-clé *</label>
            <input className="input-field" placeholder='ex: "frais", "inscription", "default"' required
              value={form.keyword} onChange={e => set('keyword', e.target.value)} />
            <p className="text-[11px] mt-1 text-slate-400">
              Le mot-clé <code>default</code> sert de réponse de secours quand rien d'autre ne correspond.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5 text-slate-500">Exemple de question (documentation)</label>
            <input className="input-field" placeholder="ex: Quels sont les frais d'inscription ?"
              value={form.question_example} onChange={e => set('question_example', e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5 text-slate-500">Réponse *</label>
            <textarea className="input-field resize-none" rows={4} required
              value={form.response} onChange={e => set('response', e.target.value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1.5 text-slate-500">Priorité</label>
              <input type="number" min="0" step="1" className="input-field"
                value={form.priority} onChange={e => set('priority', e.target.value)} />
              <p className="text-[11px] mt-1 text-slate-400">0 = priorité la plus haute</p>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)}
                  className="w-4 h-4 rounded" style={{ accentColor: COLOR }} />
                <span className="text-sm text-slate-600 font-medium">Actif</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${COLOR}, #c2410c)`, boxShadow: `0 3px 10px ${COLOR}40` }}>
              {saving ? 'Enregistrement…' : (editing ? 'Mettre à jour' : 'Créer')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default function AIResponsesPage() {
  const { notify } = useNotifications();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const { data, loading, error, execute: reload } = useApi(
    () => landingService.getAIResponses({ page_size: 100 }), [], true
  );
  const responses = data?.results || data || [];

  const handleDelete = async () => {
    try {
      await landingService.deleteAIResponse(confirmDelete.id);
      notify('Réponse supprimée', 'success');
      reload();
    } catch {
      notify('Erreur lors de la suppression', 'error');
    } finally {
      setConfirmDelete(null);
    }
  };

  const toggleActive = async (item) => {
    try {
      await landingService.updateAIResponse(item.id, { is_active: !item.is_active });
      reload();
    } catch {
      notify('Erreur lors de la mise à jour', 'error');
    }
  };

  const movePriority = async (item, direction) => {
    const newPriority = Math.max(0, (item.priority || 0) + direction);
    try {
      await landingService.updateAIResponse(item.id, { priority: newPriority });
      reload();
    } catch {
      notify('Erreur lors de la mise à jour', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Bot}
        iconColor={COLOR}
        iconBg={COLOR_ICON}
        title="Assistant IA — Vitrine"
        subtitle="Gérez les réponses automatiques du chat visiteur (mots-clés → réponses)"
        action={
          <PrimaryButton icon={Plus} label="Nouvelle réponse" onClick={() => { setEditItem(null); setShowModal(true); }} color={COLOR} />
        }
      />

      <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: COLOR_BG, border: '1px solid #fed7aa' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: COLOR }}>
          <Bot size={16} color="#fff" />
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: '#9a3412' }}>Comment ça marche</p>
          <p className="text-xs mt-0.5" style={{ color: '#9a3412', opacity: 0.85 }}>
            Le widget de chat compare la question du visiteur à chaque mot-clé actif, dans l'ordre de priorité (0 = en premier).
            La ligne avec le mot-clé <strong>default</strong> sert de réponse de secours si rien ne correspond.
          </p>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden shadow-sm" style={{ border: '1px solid #e2e8f0' }}>
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)' }}>
              {['Mot-clé', 'Exemple de question', 'Réponse', 'Priorité', 'Statut', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="py-12 text-center text-slate-400 text-sm">Chargement…</td></tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={6} className="py-8 text-center">
                  <p className="text-sm font-medium text-red-500">Erreur : {error}</p>
                  <button onClick={reload} className="mt-2 text-xs text-orange-600 underline">Réessayer</button>
                </td>
              </tr>
            )}
            {!loading && !error && responses.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: COLOR_BG }}>
                      <Bot size={24} color={COLOR} />
                    </div>
                    <p className="text-sm font-medium text-slate-500">Aucune réponse configurée</p>
                    <p className="text-xs text-slate-400">Cliquez sur "Nouvelle réponse" pour commencer</p>
                  </div>
                </td>
              </tr>
            )}
            {responses.map((item, i) => (
              <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors"
                style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs font-bold px-2 py-1 rounded-lg" style={{ background: COLOR_BG, color: COLOR }}>
                    {item.keyword}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">{item.question_example || '—'}</td>
                <td className="px-4 py-3 text-slate-600 max-w-[280px] truncate">{item.response}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-slate-700 w-5 text-center">{item.priority}</span>
                    <div className="flex flex-col">
                      <button onClick={() => movePriority(item, -1)} className="text-slate-400 hover:text-slate-700">
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => movePriority(item, 1)} className="text-slate-400 hover:text-slate-700">
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive(item)} className="flex items-center gap-1.5">
                    {item.is_active
                      ? <ToggleRight className="h-6 w-6" style={{ color: '#16a34a' }} />
                      : <ToggleLeft className="h-6 w-6 text-slate-300" />}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    <IconBtn icon={Edit} onClick={() => { setEditItem(item); setShowModal(true); }} color={COLOR} title="Modifier" />
                    <IconBtn icon={Trash2} onClick={() => setConfirmDelete(item)} color="#ef4444" title="Supprimer" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {showModal && (
        <AIResponseModal
          editing={editItem}
          onClose={() => { setShowModal(false); setEditItem(null); }}
          onSaved={() => { setShowModal(false); setEditItem(null); reload(); }}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          message={`Supprimer la réponse pour "${confirmDelete.keyword}" ?`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
