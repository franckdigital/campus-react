import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell, Send, History, BarChart2, Settings2,
  Mail, MessageSquare, Smartphone, CheckCircle,
  XCircle, Clock, RefreshCw, Plus, X, Loader2,
  AlertTriangle, Eye, Filter, ChevronDown,
  HelpCircle, ArrowRight, Zap, Users, RotateCcw
} from 'lucide-react';
import { notificationsService, academicService, usersService } from '../../services';
import { useApi } from '../../hooks/useApi';
import { useNotifications } from '../../components/Notifications';
import { useSite } from '../../contexts/SiteContext';

const COLOR    = '#0ea5e9';
const COLOR_BG = '#f0f9ff';

const CHANNEL_META = {
  IN_APP:    { label: 'In-App',    icon: Bell,          color: '#6366f1', bg: '#eef2ff' },
  EMAIL:     { label: 'Email',     icon: Mail,          color: '#0ea5e9', bg: '#f0f9ff' },
  SMS:       { label: 'SMS',       icon: Smartphone,    color: '#10b981', bg: '#f0fdf4' },
  WHATSAPP:  { label: 'WhatsApp',  icon: MessageSquare, color: '#25d366', bg: '#f0fdf4' },
  PUSH:      { label: 'Push',      icon: Bell,          color: '#f59e0b', bg: '#fefce8' },
  WEBSOCKET: { label: 'Temps réel',icon: Bell,          color: '#8b5cf6', bg: '#f5f3ff' },
};

const STATUS_META = {
  SENT:      { label: 'Envoyé',     color: '#16a34a', bg: '#dcfce7', icon: CheckCircle },
  DELIVERED: { label: 'Délivré',    color: '#16a34a', bg: '#dcfce7', icon: CheckCircle },
  PENDING:   { label: 'En attente', color: '#d97706', bg: '#fef3c7', icon: Clock },
  RETRYING:  { label: 'Relance',    color: '#0ea5e9', bg: '#f0f9ff', icon: RefreshCw },
  FAILED:    { label: 'Échoué',     color: '#dc2626', bg: '#fee2e2', icon: XCircle },
};

const EVENT_LABELS = {
  PAYMENT_VALIDATED:  { label: 'Paiement validé',     color: '#16a34a', bg: '#dcfce7' },
  ABSENCE_RECORDED:   { label: 'Absence constatée',   color: '#ef4444', bg: '#fee2e2' },
  ABSENCE_PLANNED:    { label: 'Absence prévue',      color: '#d97706', bg: '#fef3c7' },
  CASH_DEPOSIT:       { label: 'Versement caisse',    color: '#7c3aed', bg: '#f5f3ff' },
  CUSTOM:             { label: 'Personnalisé',         color: '#6b7280', bg: '#f3f4f6' },
};

function ChannelBadge({ channel }) {
  const m = CHANNEL_META[channel] || CHANNEL_META.IN_APP;
  const Icon = m.icon;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: m.bg, color: m.color }}>
      <Icon size={11} />
      {m.label}
    </span>
  );
}

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.PENDING;
  const Icon = m.icon;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: m.bg, color: m.color }}>
      <Icon size={11} />
      {m.label}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────
// Workflow Modal
// ──────────────────────────────────────────────────────────────
function WorkflowModal({ onClose }) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      icon: Zap,
      color: '#f59e0b',
      bg: '#fef3c7',
      title: 'Déclencheurs automatiques',
      subtitle: 'Chaque action métier déclenche automatiquement des notifications',
      content: (
        <div className="space-y-3">
          {[
            {
              event: 'Paiement validé',
              arrow: 'Parents de l\'étudiant',
              channels: ['IN_APP', 'EMAIL', 'SMS', 'WHATSAPP'],
              color: '#16a34a', bg: '#dcfce7',
            },
            {
              event: 'Absence constatée',
              arrow: 'Parents de l\'étudiant',
              channels: ['IN_APP', 'EMAIL', 'SMS', 'WHATSAPP'],
              color: '#ef4444', bg: '#fee2e2',
            },
            {
              event: 'Absence prévue soumise',
              arrow: 'Administration',
              channels: ['IN_APP'],
              color: '#d97706', bg: '#fef3c7',
            },
            {
              event: 'Versement caisse / mobile money',
              arrow: 'Finance + Comptabilité',
              channels: ['IN_APP', 'EMAIL'],
              color: '#7c3aed', bg: '#f5f3ff',
            },
          ].map((t, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border bg-white">
              <span className="text-xs font-semibold px-2 py-1 rounded-lg flex-shrink-0 min-w-[170px] text-center"
                style={{ background: t.bg, color: t.color }}>{t.event}</span>
              <ArrowRight size={14} className="text-gray-300 flex-shrink-0" />
              <span className="text-sm text-gray-600 flex-shrink-0">{t.arrow}</span>
              <div className="flex gap-1 ml-auto">
                {t.channels.map(ch => {
                  const m = CHANNEL_META[ch];
                  const Icon = m.icon;
                  return (
                    <span key={ch} title={m.label}
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ background: m.bg, color: m.color }}>
                      <Icon size={12} />
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
          <p className="text-xs text-gray-400 pt-1">
            Les canaux effectivement utilisés dépendent des préférences de chaque destinataire.
          </p>
        </div>
      ),
    },
    {
      icon: Send,
      color: COLOR,
      bg: COLOR_BG,
      title: 'Envoi manuel',
      subtitle: 'Diffusez un message à un groupe ou un rôle depuis l\'onglet Envoyer',
      content: (
        <div className="space-y-4">
          {[
            { num: '1', label: 'Choisir l\'audience', desc: 'Tous les parents · Enseignants · Finance · Admin · ou un utilisateur précis' },
            { num: '2', label: 'Rédiger le message', desc: 'Titre + corps libre, type (Alerte, Paiement…) et priorité' },
            { num: '3', label: 'Sélectionner les canaux', desc: 'In-App, Email, SMS, WhatsApp, Push — multi-sélection' },
            { num: '4', label: 'Envoyer', desc: 'Un NotificationLog est créé par canal et par destinataire' },
          ].map(s => (
            <div key={s.num} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{ background: COLOR }}>{s.num}</div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{s.label}</p>
                <p className="text-xs text-gray-500">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      icon: History,
      color: '#475569',
      bg: '#f8fafc',
      title: 'Historique & Relances',
      subtitle: 'Chaque tentative de livraison est tracée et peut être relancée',
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 flex-wrap py-2">
            {[
              { status: 'PENDING',   label: 'En attente' },
              { status: 'SENT',      label: 'Envoyé ✓' },
              { status: 'RETRYING',  label: 'Relance auto' },
              { status: 'FAILED',    label: 'Échec définitif' },
            ].map((s, i, arr) => (
              <div key={s.status} className="flex items-center gap-2">
                <StatusBadge status={s.status} />
                {i < arr.length - 1 && <ArrowRight size={13} className="text-gray-300" />}
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {[
              { icon: Clock,      color: '#d97706', text: 'Délai de relance exponentiel : 5 min → 10 min → 20 min (max 3 tentatives)' },
              { icon: RefreshCw,  color: COLOR,     text: 'Relance manuelle : bouton ↺ dans l\'onglet Historique sur chaque ligne FAILED' },
              { icon: AlertTriangle, color: '#ef4444', text: 'Message d\'erreur visible en survol de l\'icône ⚠ sur chaque ligne échouée' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl border bg-white">
                  <Icon size={16} style={{ color: item.color }} className="flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-600">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      ),
    },
    {
      icon: Settings2,
      color: '#7c3aed',
      bg: '#f5f3ff',
      title: 'Configuration',
      subtitle: 'Personnalisez les canaux et les messages depuis l\'onglet Templates & Préférences',
      content: (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border bg-white space-y-2">
            <p className="text-sm font-semibold text-gray-700">Préférences de canaux</p>
            <p className="text-xs text-gray-500">
              Chaque utilisateur active les canaux qu'il souhaite recevoir (Email, SMS, Push, WhatsApp)
              et renseigne son numéro si nécessaire. Les notifications automatiques respectent ces préférences.
            </p>
          </div>
          <div className="p-4 rounded-xl border bg-white space-y-2">
            <p className="text-sm font-semibold text-gray-700">Templates de messages</p>
            <p className="text-xs text-gray-500 mb-2">
              Personnalisez le texte envoyé pour chaque événement et chaque canal.
            </p>
            <div className="bg-gray-50 rounded-lg p-2 font-mono text-xs text-gray-600">
              Bonjour {'{{student_name}}'}, votre paiement<br />
              de {'{{amount}}'} FCFA a été validé le {'{{date}}'}.
            </div>
            <p className="text-xs text-gray-400">
              Variables : {'{{student_name}}'} · {'{{amount}}'} · {'{{date}}'} · {'{{subject_name}}'}
            </p>
          </div>
          <div className="p-4 rounded-xl border bg-white space-y-1">
            <p className="text-sm font-semibold text-gray-700">Providers SMS / WhatsApp</p>
            <p className="text-xs text-gray-500">
              Activez un vrai provider en ajoutant dans <code className="bg-gray-100 px-1 rounded">.env</code> :
            </p>
            <div className="bg-gray-50 rounded-lg p-2 font-mono text-xs text-gray-600 space-y-0.5">
              <div>SMS_PROVIDER=twilio</div>
              <div>TWILIO_ACCOUNT_SID=ACxxxxx</div>
              <div>TWILIO_AUTH_TOKEN=xxxxxxx</div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const current = steps[step];
  const Icon = current.icon;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: current.bg }}>
              <Icon size={18} style={{ color: current.color }} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">{current.title}</h3>
              <p className="text-xs text-gray-500">{current.subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400">
            <X size={18} />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 px-6 pt-4">
          {steps.map((s, i) => {
            const SIcon = s.icon;
            return (
              <button key={i} onClick={() => setStep(i)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
                style={i === step
                  ? { background: s.bg, color: s.color, borderColor: s.color + '66' }
                  : { background: 'white', color: '#9ca3af', borderColor: '#e5e7eb' }}>
                <SIcon size={12} />
                <span className="hidden sm:inline">{['Déclencheurs', 'Envoi manuel', 'Historique', 'Config'][i]}</span>
                <span className="sm:hidden">{i + 1}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-6 py-4 flex-1">
          {current.content}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-30">
            ← Précédent
          </button>
          <span className="text-xs text-gray-400">{step + 1} / {steps.length}</span>
          {step < steps.length - 1 ? (
            <button onClick={() => setStep(s => s + 1)}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-2"
              style={{ background: COLOR }}>
              Suivant <ArrowRight size={14} />
            </button>
          ) : (
            <button onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: COLOR }}>
              Fermer
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ──────────────────────────────────────────────────────────────
// Send Modal
// ──────────────────────────────────────────────────────────────
const NOTIF_TYPES = [
  { value: 'PAYMENT',    label: 'Paiement' },
  { value: 'ATTENDANCE', label: 'Présence' },
  { value: 'ABSENCE',    label: 'Absence' },
  { value: 'GRADE',      label: 'Note' },
  { value: 'SYSTEM',     label: 'Système' },
  { value: 'ALERT',      label: 'Alerte' },
  { value: 'FINANCE',    label: 'Finance' },
];
const ROLES = [
  { value: '', label: 'Utilisateur spécifique' },
  { value: 'ADMIN', label: 'Tous les admins' },
  { value: 'TEACHER', label: 'Tous les enseignants' },
  { value: 'PARENT', label: 'Tous les parents' },
  { value: 'STUDENT', label: 'Tous les étudiants' },
  { value: 'FINANCE', label: 'Finance' },
];

function SendModal({ onClose, onSent }) {
  const { notify } = useNotifications();
  const [form, setForm] = useState({
    role: '',
    notification_type: 'SYSTEM',
    priority: 'NORMAL',
    title: '',
    message: '',
    channels: ['IN_APP'],
  });
  const [sending, setSending] = useState(false);

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const toggleChannel = (ch) => {
    setForm(p => ({
      ...p,
      channels: p.channels.includes(ch)
        ? p.channels.filter(c => c !== ch)
        : [...p.channels, ch],
    }));
  };

  const handleSend = async () => {
    if (!form.title || !form.message) {
      notify('Titre et message requis', 'error'); return;
    }
    if (!form.role) {
      notify('Sélectionnez un groupe cible', 'error'); return;
    }
    setSending(true);
    try {
      const payload = {
        notification_type: form.notification_type,
        priority: form.priority,
        title: form.title,
        message: form.message,
        channels: form.channels,
        role: form.role || undefined,
      };
      const res = await notificationsService.send(payload);
      notify(res.detail || 'Notifications envoyées', 'success');
      onSent();
    } catch (e) {
      notify(e.message || 'Erreur envoi', 'error');
    } finally {
      setSending(false);
    }
  };

  const allChannels = ['IN_APP', 'EMAIL', 'SMS', 'WHATSAPP', 'PUSH'];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
            <Send size={18} style={{ color: COLOR }} /> Envoyer une notification
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Audience cible *</label>
            <select value={form.role} onChange={e => f('role', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none">
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={form.notification_type} onChange={e => f('notification_type', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none">
                {NOTIF_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priorité</label>
              <select value={form.priority} onChange={e => f('priority', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none">
                <option value="LOW">Basse</option>
                <option value="NORMAL">Normale</option>
                <option value="HIGH">Haute</option>
                <option value="URGENT">Urgente</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
            <input value={form.title} onChange={e => f('title', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
              placeholder="Titre de la notification" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
            <textarea value={form.message} onChange={e => f('message', e.target.value)}
              rows={3} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
              placeholder="Corps du message…" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Canaux d'envoi</label>
            <div className="flex flex-wrap gap-2">
              {allChannels.map(ch => {
                const m = CHANNEL_META[ch];
                const Icon = m.icon;
                const active = form.channels.includes(ch);
                return (
                  <button key={ch} onClick={() => toggleChannel(ch)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                    style={active
                      ? { background: m.bg, color: m.color, borderColor: m.color }
                      : { background: 'white', color: '#9ca3af', borderColor: '#e5e7eb' }}>
                    <Icon size={13} />
                    {m.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Seuls les canaux activés dans les préférences utilisateur seront effectivement utilisés.
            </p>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">
            Annuler
          </button>
          <button onClick={handleSend} disabled={sending}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2"
            style={{ background: COLOR }}>
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {sending ? 'Envoi…' : 'Envoyer'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ──────────────────────────────────────────────────────────────
// Template Modal
// ──────────────────────────────────────────────────────────────
function TemplateModal({ editing, onClose, onSaved, siteId }) {
  const { notify } = useNotifications();
  const [form, setForm] = useState({
    name:       editing?.name       || '',
    event_type: editing?.event_type || 'CUSTOM',
    channel:    editing?.channel    || 'EMAIL',
    subject:    editing?.subject    || '',
    body:       editing?.body       || '',
    site:       editing?.site       || siteId || '',
  });
  const [saving, setSaving] = useState(false);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.name || !form.body) { notify('Nom et corps requis', 'error'); return; }
    setSaving(true);
    try {
      if (editing) {
        await notificationsService.updateTemplate(editing.id, form);
      } else {
        await notificationsService.createTemplate(form);
      }
      notify('Template enregistré', 'success');
      onSaved();
    } catch (e) { notify(e.message || 'Erreur', 'error'); }
    finally { setSaving(false); }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-lg text-gray-800">{editing ? 'Modifier template' : 'Nouveau template'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
            <input value={form.name} onChange={e => f('name', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Nom du template" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Événement</label>
              <select value={form.event_type} onChange={e => f('event_type', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="PAYMENT_VALIDATED">Paiement validé</option>
                <option value="ABSENCE_RECORDED">Absence constatée</option>
                <option value="ABSENCE_PLANNED">Absence prévue</option>
                <option value="CASH_DEPOSIT">Versement caisse</option>
                <option value="GRADE_PUBLISHED">Note publiée</option>
                <option value="BULLETIN_PUBLISHED">Bulletin publié</option>
                <option value="CUSTOM">Personnalisé</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Canal</label>
              <select value={form.channel} onChange={e => f('channel', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                {Object.entries(CHANNEL_META).map(([v, m]) =>
                  v !== 'WEBSOCKET' && <option key={v} value={v}>{m.label}</option>
                )}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sujet (email / titre)</label>
            <input value={form.subject} onChange={e => f('subject', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Ex: Confirmation de paiement" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Corps du message *</label>
            <textarea value={form.body} onChange={e => f('body', e.target.value)}
              rows={5} className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
              placeholder="Bonjour {{student_name}}, votre paiement de {{amount}} FCFA a été validé…" />
            <p className="text-xs text-gray-400 mt-1">
              Variables: {'{{student_name}}'}, {'{{amount}}'}, {'{{date}}'}, {'{{subject_name}}'}
            </p>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">
            Annuler
          </button>
          <button onClick={save} disabled={saving}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2"
            style={{ background: COLOR }}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : null}
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ──────────────────────────────────────────────────────────────
// Tab: Envoyer (Compose)
// ──────────────────────────────────────────────────────────────
function SendTab() {
  const [showModal, setShowModal] = useState(false);
  const { notify } = useNotifications();
  const { data: recentData, loading, execute: refresh } = useApi(
    () => notificationsService.getLogs({ ordering: '-created_at' }),
    []
  );
  const recent = recentData?.results || recentData || [];

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h3 className="font-semibold text-gray-800">Envoyer une notification</h3>
          <p className="text-sm text-gray-500 mt-0.5">Diffusez un message à un groupe ou un rôle précis</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: COLOR }}>
          <Send size={15} /> Nouveau message
        </button>
      </div>

      {/* Channel overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {['EMAIL', 'SMS', 'WHATSAPP', 'PUSH'].map(ch => {
          const m = CHANNEL_META[ch];
          const Icon = m.icon;
          return (
            <div key={ch} className="p-4 rounded-xl border flex items-center gap-3"
              style={{ background: m.bg, borderColor: m.color + '33' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: m.color + '20' }}>
                <Icon size={18} style={{ color: m.color }} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{m.label}</p>
                <p className="text-sm font-bold" style={{ color: m.color }}>Configuré</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* H2 trigger info */}
      <div className="rounded-xl border p-4 mb-6" style={{ background: '#fafafa' }}>
        <h4 className="font-semibold text-gray-700 mb-3 text-sm">Déclencheurs automatiques (H2)</h4>
        <div className="space-y-2">
          {[
            { event: 'PAYMENT_VALIDATED', desc: 'Paiement validé → parents de l\'étudiant (multi-canal)' },
            { event: 'ABSENCE_RECORDED',  desc: 'Absence constatée → parents (multi-canal)' },
            { event: 'ABSENCE_PLANNED',   desc: 'Absence prévue soumise → administration (in-app)' },
            { event: 'CASH_DEPOSIT',      desc: 'Versement caisse / mobile money → finance + compta (in-app + email)' },
          ].map(t => {
            const m = EVENT_LABELS[t.event] || EVENT_LABELS.CUSTOM;
            return (
              <div key={t.event} className="flex items-center gap-3">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: m.bg, color: m.color }}>{m.label}</span>
                <span className="text-sm text-gray-600">{t.desc}</span>
                <CheckCircle size={14} className="ml-auto flex-shrink-0 text-green-500" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent logs */}
      <h4 className="font-semibold text-gray-700 mb-3 text-sm">Envois récents</h4>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={22} className="animate-spin text-gray-400" /></div>
      ) : recent.slice(0, 8).length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">Aucun envoi récent</p>
      ) : (
        <div className="space-y-2">
          {recent.slice(0, 8).map(log => (
            <div key={log.id} className="flex items-center gap-3 p-3 rounded-xl border bg-white text-sm">
              <ChannelBadge channel={log.channel} />
              <span className="font-medium text-gray-800 truncate flex-1">{log.notification_title}</span>
              <span className="text-gray-400 text-xs truncate max-w-[140px]">{log.recipient_name}</span>
              <StatusBadge status={log.status} />
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <SendModal onClose={() => setShowModal(false)} onSent={() => { setShowModal(false); refresh(); }} />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Tab: Historique (H3)
// ──────────────────────────────────────────────────────────────
function HistoryTab({ selectedSite }) {
  const { notify } = useNotifications();
  const [filterChannel, setFilterChannel] = useState('');
  const [filterStatus,  setFilterStatus]  = useState('');
  const [filterType,    setFilterType]    = useState('');
  const [search,        setSearch]        = useState('');
  const [retryingId,    setRetryingId]    = useState(null);

  const params = {
    ...(filterChannel ? { channel: filterChannel } : {}),
    ...(filterStatus  ? { status: filterStatus }   : {}),
    ...(filterType    ? { notification__notification_type: filterType } : {}),
    ...(search        ? { search }                 : {}),
  };

  const { data: logsData, loading, execute: fetchLogs } = useApi(
    () => notificationsService.getLogs({ ...params, ordering: '-created_at' }),
    [filterChannel, filterStatus, filterType, search]
  );
  const logs = logsData?.results || logsData || [];

  const handleRetry = async (log) => {
    setRetryingId(log.id);
    try {
      await notificationsService.retryLog(log.id);
      notify('Relance effectuée', 'success');
      fetchLogs();
    } catch (e) { notify(e.message || 'Erreur relance', 'error'); }
    finally { setRetryingId(null); }
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher…"
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none bg-white min-w-[180px]" />
        <select value={filterChannel} onChange={e => setFilterChannel(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
          <option value="">Tous les canaux</option>
          {Object.entries(CHANNEL_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
          <option value="">Tous les types</option>
          {NOTIF_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <button onClick={() => fetchLogs()}
          className="p-2 border rounded-lg hover:bg-gray-100 text-gray-500">
          <RefreshCw size={16} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <History size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">Aucun log trouvé</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: COLOR_BG }}>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Notification</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Destinataire</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Canal</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Statut</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Adresse</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Tentatives</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={log.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                  style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td className="px-4 py-3 font-medium text-gray-800 max-w-[200px] truncate">
                    {log.notification_title}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{log.recipient_name || '–'}</td>
                  <td className="px-4 py-3 text-center"><ChannelBadge channel={log.channel} /></td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={log.status} /></td>
                  <td className="px-4 py-3 text-gray-400 text-xs font-mono truncate max-w-[140px]">
                    {log.recipient_address || '–'}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-500">
                    {log.retry_count}/{log.max_retries}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {log.created_at ? new Date(log.created_at).toLocaleString('fr-FR', {
                      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                    }) : '–'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {(log.status === 'FAILED' || log.status === 'RETRYING') && (
                      <button onClick={() => handleRetry(log)}
                        disabled={retryingId === log.id}
                        title="Relancer"
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 disabled:opacity-40">
                        {retryingId === log.id
                          ? <Loader2 size={14} className="animate-spin" />
                          : <RefreshCw size={14} />}
                      </button>
                    )}
                    {log.error_message && (
                      <span title={log.error_message}>
                        <AlertTriangle size={14} className="text-orange-400 inline" />
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Tab: Statistiques
// ──────────────────────────────────────────────────────────────
function StatsTab({ selectedSite }) {
  const siteFilter = selectedSite !== 'all' ? { site_id: selectedSite } : {};
  const { data: stats, loading } = useApi(
    () => notificationsService.getStats({ ...siteFilter, days: 30 }),
    [selectedSite]
  );

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 size={28} className="animate-spin text-gray-400" />
    </div>
  );

  if (!stats) return null;

  const byChannel = stats.by_channel || {};
  const byType    = stats.by_type    || [];

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Envoyés', value: stats.total_sent    || 0, color: '#16a34a', bg: '#dcfce7' },
          { label: 'Échoués', value: stats.total_failed  || 0, color: '#dc2626', bg: '#fee2e2' },
          { label: 'Relance', value: stats.total_retrying|| 0, color: '#d97706', bg: '#fef3c7' },
        ].map(k => (
          <div key={k.label} className="rounded-xl p-4 border"
            style={{ background: k.bg, borderColor: k.color + '33' }}>
            <p className="text-xs text-gray-500 mb-1">{k.label} (30j)</p>
            <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* By channel */}
      <div>
        <h4 className="font-semibold text-gray-700 mb-3 text-sm">Taux de livraison par canal</h4>
        <div className="space-y-3">
          {Object.entries(byChannel).map(([ch, data]) => {
            const m = CHANNEL_META[ch] || CHANNEL_META.IN_APP;
            const Icon = m.icon;
            return (
              <div key={ch} className="p-3 rounded-xl border bg-white">
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={15} style={{ color: m.color }} />
                  <span className="text-sm font-semibold text-gray-700">{m.label}</span>
                  <span className="ml-auto text-sm font-bold" style={{ color: m.color }}>
                    {data.rate}%
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${data.rate}%`, background: m.color }} />
                </div>
                <div className="flex gap-4 mt-1.5 text-xs text-gray-400">
                  <span>✓ {data.sent} envoyés</span>
                  <span>✗ {data.failed} échoués</span>
                  <span>⏳ {data.pending} en attente</span>
                </div>
              </div>
            );
          })}
          {Object.keys(byChannel).length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">Aucune donnée sur les 30 derniers jours</p>
          )}
        </div>
      </div>

      {/* By type */}
      {byType.length > 0 && (
        <div>
          <h4 className="font-semibold text-gray-700 mb-3 text-sm">Par type d'événement</h4>
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: COLOR_BG }}>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-700">Type</th>
                  <th className="px-4 py-2.5 text-center font-semibold text-gray-700">Total</th>
                  <th className="px-4 py-2.5 text-center font-semibold text-gray-700">Non lues</th>
                </tr>
              </thead>
              <tbody>
                {byType.map((t, i) => (
                  <tr key={t.notification_type}
                    className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                    style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td className="px-4 py-2.5 font-medium text-gray-700">
                      {NOTIF_TYPES.find(n => n.value === t.notification_type)?.label || t.notification_type}
                    </td>
                    <td className="px-4 py-2.5 text-center font-mono text-gray-700">{t.total}</td>
                    <td className="px-4 py-2.5 text-center">
                      {t.unread > 0 ? (
                        <span className="font-semibold text-orange-600">{t.unread}</span>
                      ) : (
                        <span className="text-gray-300">–</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* Recent failed */}
      {stats.recent_failed?.length > 0 && (
        <div>
          <h4 className="font-semibold text-gray-700 mb-3 text-sm flex items-center gap-2">
            <AlertTriangle size={15} className="text-red-500" /> Échecs récents
          </h4>
          <div className="space-y-2">
            {stats.recent_failed.slice(0, 5).map(log => (
              <div key={log.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-red-100 bg-red-50 text-sm">
                <ChannelBadge channel={log.channel} />
                <span className="font-medium text-gray-800 truncate flex-1">{log.notification_title}</span>
                <span className="text-red-600 text-xs truncate max-w-[200px]"
                  title={log.error_message}>{log.error_message || 'Erreur inconnue'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Tab: Templates & Préférences
// ──────────────────────────────────────────────────────────────
function TemplatesTab({ selectedSite }) {
  const { notify } = useNotifications();
  const siteId = selectedSite !== 'all' ? selectedSite : '';
  const [showModal, setShowModal]     = useState(false);
  const [editingTpl, setEditingTpl]   = useState(null);

  const { data: tplData, loading, execute: fetchTpls } = useApi(
    () => notificationsService.getTemplates(siteId ? { site: siteId } : {}),
    [selectedSite]
  );
  const templates = tplData?.results || tplData || [];

  // Preferences
  const { data: prefs, execute: fetchPrefs } = useApi(
    () => notificationsService.getPreferences(), []
  );
  const [prefForm, setPrefForm] = useState(null);
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    if (prefs && !prefForm) {
      setPrefForm({
        email_enabled:    prefs.email_enabled    ?? true,
        sms_enabled:      prefs.sms_enabled      ?? false,
        push_enabled:     prefs.push_enabled     ?? true,
        whatsapp_enabled: prefs.whatsapp_enabled ?? false,
        phone_number:     prefs.phone_number     || '',
        whatsapp_number:  prefs.whatsapp_number  || '',
      });
    }
  }, [prefs, prefForm]);

  const savePrefs = async () => {
    if (!prefForm) return;
    setSavingPrefs(true);
    try {
      await notificationsService.updatePreferences(prefForm);
      notify('Préférences enregistrées', 'success');
      fetchPrefs();
    } catch (e) { notify(e.message || 'Erreur', 'error'); }
    finally { setSavingPrefs(false); }
  };

  const handleDeleteTpl = async (id) => {
    if (!window.confirm('Supprimer ce template ?')) return;
    try {
      await notificationsService.deleteTemplate(id);
      notify('Template supprimé', 'success');
      fetchTpls();
    } catch { notify('Erreur', 'error'); }
  };

  return (
    <div className="space-y-8">
      {/* Preferences section */}
      <div className="rounded-xl border p-5" style={{ background: COLOR_BG }}>
        <h4 className="font-semibold text-gray-800 mb-4">Mes préférences de canaux</h4>
        {prefForm ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { key: 'email_enabled',    label: 'Email',     icon: Mail },
                { key: 'sms_enabled',      label: 'SMS',       icon: Smartphone },
                { key: 'push_enabled',     label: 'Push',      icon: Bell },
                { key: 'whatsapp_enabled', label: 'WhatsApp',  icon: MessageSquare },
              ].map(({ key, label, icon: Icon }) => (
                <label key={key}
                  className="flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all"
                  style={prefForm[key]
                    ? { background: COLOR + '15', borderColor: COLOR, color: COLOR }
                    : { background: 'white', borderColor: '#e5e7eb', color: '#6b7280' }}>
                  <input type="checkbox" checked={!!prefForm[key]}
                    onChange={e => setPrefForm(p => ({ ...p, [key]: e.target.checked }))}
                    className="accent-sky-500" />
                  <Icon size={14} />
                  <span className="text-sm font-medium">{label}</span>
                </label>
              ))}
            </div>
            {prefForm.sms_enabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Numéro SMS</label>
                <input value={prefForm.phone_number}
                  onChange={e => setPrefForm(p => ({ ...p, phone_number: e.target.value }))}
                  className="border rounded-lg px-3 py-2 text-sm focus:outline-none w-full max-w-xs"
                  placeholder="+225 07 00 00 00 00" />
              </div>
            )}
            {prefForm.whatsapp_enabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Numéro WhatsApp</label>
                <input value={prefForm.whatsapp_number}
                  onChange={e => setPrefForm(p => ({ ...p, whatsapp_number: e.target.value }))}
                  className="border rounded-lg px-3 py-2 text-sm focus:outline-none w-full max-w-xs"
                  placeholder="+225 07 00 00 00 00" />
              </div>
            )}
            <button onClick={savePrefs} disabled={savingPrefs}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: COLOR }}>
              {savingPrefs ? <Loader2 size={14} className="animate-spin" /> : null}
              {savingPrefs ? 'Enregistrement…' : 'Sauvegarder'}
            </button>
          </div>
        ) : (
          <div className="flex justify-center py-6"><Loader2 size={22} className="animate-spin text-gray-400" /></div>
        )}
      </div>

      {/* Templates section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-800">Templates de messages</h4>
          <button onClick={() => { setEditingTpl(null); setShowModal(true); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
            style={{ background: COLOR }}>
            <Plus size={14} /> Nouveau template
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 size={22} className="animate-spin text-gray-400" /></div>
        ) : templates.length === 0 ? (
          <div className="text-center py-10 text-gray-400 border rounded-xl">
            <Settings2 size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Aucun template — créez-en un pour personnaliser vos messages automatiques</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {templates.map(tpl => {
              const ev = EVENT_LABELS[tpl.event_type] || EVENT_LABELS.CUSTOM;
              const ch = CHANNEL_META[tpl.channel]   || CHANNEL_META.IN_APP;
              return (
                <div key={tpl.id}
                  className="flex items-start gap-3 p-4 rounded-xl border bg-white hover:border-sky-200 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-800 text-sm">{tpl.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: ev.bg, color: ev.color }}>{ev.label}</span>
                      <ChannelBadge channel={tpl.channel} />
                    </div>
                    {tpl.subject && (
                      <p className="text-xs text-gray-500 mb-1"><b>Sujet:</b> {tpl.subject}</p>
                    )}
                    <p className="text-xs text-gray-400 line-clamp-2">{tpl.body}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => { setEditingTpl(tpl); setShowModal(true); }}
                      className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700">
                      <Settings2 size={14} />
                    </button>
                    <button onClick={() => handleDeleteTpl(tpl.id)}
                      className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <TemplateModal
          editing={editingTpl}
          siteId={siteId}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchTpls(); }}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────────────────────
export default function NotificationsAdmin() {
  const { selectedSite } = useSite();
  const [activeTab, setActiveTab]       = useState('send');
  const [showWorkflow, setShowWorkflow] = useState(false);

  const tabs = [
    { id: 'send',      label: 'Envoyer',       icon: Send },
    { id: 'history',   label: 'Historique',    icon: History },
    { id: 'stats',     label: 'Statistiques',  icon: BarChart2 },
    { id: 'templates', label: 'Templates & Préférences', icon: Settings2 },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm"
          style={{ background: '#e0f2fe' }}>
          <Bell size={22} style={{ color: COLOR }} />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Notifications & Communication</h1>
          <p className="text-sm text-gray-500">Email, SMS, WhatsApp, Push — historique et relances automatiques</p>
        </div>
        <button
          onClick={() => setShowWorkflow(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all hover:shadow-sm"
          style={{ borderColor: COLOR + '66', color: COLOR, background: COLOR_BG }}>
          <HelpCircle size={16} />
          Comment ça fonctionne ?
        </button>
      </div>

      {showWorkflow && <WorkflowModal onClose={() => setShowWorkflow(false)} />}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-gray-100 rounded-xl w-fit flex-wrap">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={active
                ? { background: 'white', color: COLOR, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                : { color: '#6b7280' }}>
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {activeTab === 'send'      && <SendTab selectedSite={selectedSite} />}
        {activeTab === 'history'   && <HistoryTab selectedSite={selectedSite} />}
        {activeTab === 'stats'     && <StatsTab selectedSite={selectedSite} />}
        {activeTab === 'templates' && <TemplatesTab selectedSite={selectedSite} />}
      </div>
    </div>
  );
}
