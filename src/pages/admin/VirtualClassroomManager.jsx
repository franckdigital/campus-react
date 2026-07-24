import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Video, Plus, Edit2, Trash2, Play, MessageSquare,
  HandMetal, BarChart2, Zap, X, Send,
  CheckCircle, Clock, ExternalLink, Loader, StopCircle,
  Calendar, Users, Wifi, Globe,
} from 'lucide-react';
import useApi from '../../hooks/useApi';
import elearningService from '../../services/elearning';
import academicService from '../../services/academic';
import sitesService from '../../services/sites';
import { useConfirm } from '../../components/ConfirmDialog';
import { useSite } from '../../contexts/SiteContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const PROVIDERS = [
  { value: 'JITSI',  label: 'Jitsi Meet (intégré)', color: '#dbeafe', text: '#1e40af' },
  { value: 'ZOOM',   label: 'Zoom',                  color: '#e0f2fe', text: '#0369a1' },
  { value: 'MEET',   label: 'Google Meet',            color: '#dcfce7', text: '#166534' },
  { value: 'TEAMS',  label: 'Microsoft Teams',        color: '#ede9fe', text: '#5b21b6' },
  { value: 'BBB',    label: 'BigBlueButton',          color: '#ffedd5', text: '#9a3412' },
  { value: 'OTHER',  label: 'Autre',                  color: '#f1f5f9', text: '#475569' },
];

const EMPTY_FORM = {
  title: '', provider: 'JITSI',
  class_obj: '', subject: '',
  start_time: '', duration_minutes: 60,
  join_url: '', host_url: '', meeting_id: '', password: '', jitsi_room_name: '',
  enable_recording: false, enable_whiteboard: true,
  enable_polls: true, enable_chat: true, enable_hand_raise: true,
  breakout_rooms: 0,
};

const FEATURES = [
  { key: 'enable_recording',  label: 'Enregistrement', icon: '⏺' },
  { key: 'enable_whiteboard', label: 'Tableau blanc',  icon: '🖊' },
  { key: 'enable_polls',      label: 'Sondages',       icon: '📊' },
  { key: 'enable_chat',       label: 'Chat',           icon: '💬' },
  { key: 'enable_hand_raise', label: 'Lever la main',  icon: '✋' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDatetimeLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function getStatus(cr) {
  if (cr.is_ended) return 'ended';
  if (new Date(cr.start_time) <= new Date()) return 'live';
  return 'upcoming';
}

function providerInfo(val) {
  return PROVIDERS.find(p => p.value === val) || PROVIDERS[PROVIDERS.length - 1];
}

// ─── Input style helpers ──────────────────────────────────────────────────────

const INPUT_BASE = {
  width: '100%', padding: '10px 14px', borderRadius: 12, fontSize: 14,
  border: '1.5px solid #e2e8f0', outline: 'none', background: '#fff',
  color: '#0f172a', fontFamily: 'inherit', boxSizing: 'border-box',
};

function FocusInput({ style, ...props }) {
  return (
    <input
      style={{ ...INPUT_BASE, ...style }}
      onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
      {...props}
    />
  );
}

function FieldLabel({ children, required }) {
  return (
    <label style={{ display: 'block', marginBottom: 6, fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {children}{required && <span style={{ color: '#ef4444' }}> *</span>}
    </label>
  );
}

// ─── ClassroomModal ───────────────────────────────────────────────────────────

function ClassroomModal({ classroom, classes = [], subjects = [], onClose, onSaved }) {
  const [form, setForm] = useState(classroom ? {
    title: classroom.title || '',
    provider: classroom.provider || 'JITSI',
    class_obj: String(classroom.class_obj || ''),
    subject: String(classroom.subject || ''),
    start_time: toDatetimeLocal(classroom.start_time),
    duration_minutes: classroom.duration_minutes || 60,
    join_url: classroom.join_url || '',
    host_url: classroom.host_url || '',
    meeting_id: classroom.meeting_id || '',
    password: classroom.password || '',
    jitsi_room_name: classroom.jitsi_room_name || '',
    enable_recording: !!classroom.enable_recording,
    enable_whiteboard: !!classroom.enable_whiteboard,
    enable_polls: !!classroom.enable_polls,
    enable_chat: !!classroom.enable_chat,
    enable_hand_raise: !!classroom.enable_hand_raise,
    breakout_rooms: classroom.breakout_rooms || 0,
  } : { ...EMPTY_FORM });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.title || !form.class_obj || !form.subject || !form.start_time) {
      setError('Titre, classe, matière et heure de début sont requis.'); return;
    }
    setSaving(true); setError('');
    try {
      // Build explicit payload — omit empty optional strings (avoid URLField validation issues)
      const payload = {
        title: form.title,
        provider: form.provider,
        class_obj: form.class_obj,
        subject: form.subject,
        start_time: form.start_time,
        duration_minutes: Number(form.duration_minutes) || 60,
        enable_recording: form.enable_recording,
        enable_whiteboard: form.enable_whiteboard,
        enable_polls: form.enable_polls,
        enable_chat: form.enable_chat,
        enable_hand_raise: form.enable_hand_raise,
        breakout_rooms: Number(form.breakout_rooms) || 0,
      };
      if (form.join_url) payload.join_url = form.join_url;
      if (form.host_url) payload.host_url = form.host_url;
      if (form.meeting_id) payload.meeting_id = form.meeting_id;
      if (form.password) payload.password = form.password;
      if (form.jitsi_room_name) payload.jitsi_room_name = form.jitsi_room_name;

      console.log('[VCR] sending payload:', JSON.stringify(payload));

      if (classroom) {
        await elearningService.updateClassroom(classroom.id, payload);
      } else {
        await elearningService.createClassroom(payload);
      }
      onSaved();
    } catch (e) {
      console.error('[VCR] save error:', e);
      setError(e.message || 'Erreur lors de la sauvegarde.');
    }
    setSaving(false);
  };

  const needsUrl = ['ZOOM', 'MEET', 'TEAMS', 'BBB', 'OTHER'].includes(form.provider);
  const isEdit = !!classroom;

  return createPortal(
    <div
      onClick={onClose}
      className="p-2 sm:p-4"
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(8,12,36,0.7)', backdropFilter: 'blur(12px)' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 620, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,0.3)', overflow: 'hidden' }}
      >
        {/* Gradient header */}
        <div className="px-4 sm:px-6 py-5" style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexShrink: 0 }}>
          <div className="min-w-0" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Video size={20} color="#fff" />
            </div>
            <div className="min-w-0">
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                {isEdit ? 'Modification' : 'Création'}
              </p>
              <h2 className="truncate" style={{ color: '#fff', fontSize: 17, fontWeight: 800, margin: 0 }}>
                {isEdit ? 'Modifier la classe virtuelle' : 'Nouvelle classe virtuelle'}
              </h2>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X size={16} color="#fff" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6" style={{ overflowY: 'auto', background: '#fff', flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Titre */}
          <div>
            <FieldLabel required>Titre</FieldLabel>
            <FocusInput
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Ex: Cours d'algorithmes — Séance 3"
              autoComplete="new-password"
              name="vcr-title-field"
            />
          </div>

          {/* Plateforme */}
          <div>
            <FieldLabel required>Plateforme</FieldLabel>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PROVIDERS.map(p => {
                const active = form.provider === p.value;
                return (
                  <button key={p.value} type="button" onClick={() => set('provider', p.value)} style={{
                    padding: '9px 8px', borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                    border: `2px solid ${active ? '#6366f1' : '#e2e8f0'}`,
                    background: active ? '#eef2ff' : '#f8fafc',
                    color: active ? '#4f46e5' : '#64748b',
                    boxShadow: active ? '0 2px 8px rgba(99,102,241,0.15)' : 'none',
                  }}>
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Classe + Matière */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <FieldLabel required>Classe</FieldLabel>
              <select value={form.class_obj} onChange={e => set('class_obj', e.target.value)}
                style={{ ...INPUT_BASE, cursor: 'pointer' }}>
                <option value="">Sélectionner…</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel required>Matière</FieldLabel>
              <select value={form.subject} onChange={e => set('subject', e.target.value)}
                style={{ ...INPUT_BASE, cursor: 'pointer' }}>
                <option value="">Sélectionner…</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {/* Date + Durée */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <FieldLabel required>Date & heure</FieldLabel>
              <FocusInput type="datetime-local" value={form.start_time} onChange={e => set('start_time', e.target.value)} />
            </div>
            <div>
              <FieldLabel>Durée (minutes)</FieldLabel>
              <FocusInput type="number" min={15} max={480} value={form.duration_minutes}
                onChange={e => set('duration_minutes', parseInt(e.target.value) || 60)} />
            </div>
          </div>

          {/* Jitsi room name */}
          {form.provider === 'JITSI' && (
            <div>
              <FieldLabel>Nom de la salle Jitsi</FieldLabel>
              <FocusInput value={form.jitsi_room_name} onChange={e => set('jitsi_room_name', e.target.value)}
                placeholder="Laisser vide pour générer automatiquement" />
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 5 }}>La salle sera intégrée directement dans l'interface.</p>
            </div>
          )}

          {/* URL fields for external providers */}
          {needsUrl && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <FieldLabel>URL de participation</FieldLabel>
                <FocusInput type="url" value={form.join_url} onChange={e => set('join_url', e.target.value)}
                  placeholder="https://meet.google.com/…" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <FieldLabel>ID réunion</FieldLabel>
                  <FocusInput value={form.meeting_id} onChange={e => set('meeting_id', e.target.value)} placeholder="123 456 7890" />
                </div>
                <div>
                  <FieldLabel>Mot de passe</FieldLabel>
                  <FocusInput value={form.password} onChange={e => set('password', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Fonctionnalités */}
          <div style={{ borderRadius: 16, padding: '16px 18px', background: '#f8faff', border: '1.5px solid #e0e7ff' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#4338ca', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Fonctionnalités
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FEATURES.map(({ key, label, icon }) => {
                const on = !!form[key];
                return (
                  <label key={key} onClick={() => set(key, !on)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 10px', borderRadius: 10, background: on ? '#eef2ff' : '#fff', border: `1.5px solid ${on ? '#c7d2fe' : '#e2e8f0'}`, transition: 'all 0.15s', userSelect: 'none' }}>
                    <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${on ? '#6366f1' : '#cbd5e1'}`, background: on ? '#6366f1' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                      {on && <CheckCircle size={12} color="#fff" strokeWidth={3} />}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: on ? '#4338ca' : '#64748b' }}>{icon} {label}</span>
                  </label>
                );
              })}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', flexShrink: 0 }}>🏠 Salles de travail</span>
                <input type="number" min={0} max={20} value={form.breakout_rooms}
                  onChange={e => set('breakout_rooms', parseInt(e.target.value) || 0)}
                  style={{ width: 48, padding: '3px 8px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, fontWeight: 700, color: '#4338ca', background: '#eef2ff', outline: 'none', marginLeft: 'auto' }} />
              </div>
            </div>
          </div>

        </div>

        {/* Footer — sticky, always visible */}
        <div className="px-4 sm:px-6 pt-3 pb-4" style={{ borderTop: '1.5px solid #f0f4f9', background: '#fff', flexShrink: 0 }}>
          {/* Error banner — visible regardless of scroll position */}
          {error && (
            <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 12, background: '#fef2f2', border: '1.5px solid #fca5a5', fontSize: 13, color: '#b91c1c', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <X size={14} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ lineHeight: 1.45 }}>{error}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: 13, fontWeight: 600, color: '#64748b', cursor: 'pointer' }}>
              Annuler
            </button>
            <button onClick={save} disabled={saving} style={{ padding: '10px 24px', borderRadius: 12, border: 'none', background: saving ? '#a5b4fc' : 'linear-gradient(135deg,#4f46e5,#7c3aed)', fontSize: 13, fontWeight: 700, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: saving ? 'none' : '0 4px 14px rgba(99,102,241,0.35)' }}>
              {saving && <Loader size={14} className="animate-spin" />}
              {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer les modifications' : 'Créer la session'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── SpontaneousModal ─────────────────────────────────────────────────────────
// Creates an ad-hoc virtual class open to everyone (students, teachers, staff)
// on a given site — no class/subject assignment needed, starts immediately.

function SpontaneousModal({ classroom, sites = [], defaultSiteId, onClose, onSaved }) {
  const isEdit = !!classroom;
  const [title, setTitle] = useState(classroom?.title || 'Réunion spontanée');
  const [siteId, setSiteId] = useState(classroom?.site || defaultSiteId || '');
  const [provider, setProvider] = useState(classroom?.provider || 'JITSI');
  const [startTime, setStartTime] = useState(toDatetimeLocal(classroom?.start_time) || toDatetimeLocal(new Date().toISOString()));
  const [durationMinutes, setDurationMinutes] = useState(classroom?.duration_minutes || 60);
  const [joinUrl, setJoinUrl] = useState(classroom?.join_url || '');
  const [meetingId, setMeetingId] = useState(classroom?.meeting_id || '');
  const [password, setPassword] = useState(classroom?.password || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const needsUrl = ['ZOOM', 'MEET', 'TEAMS', 'BBB', 'OTHER'].includes(provider);

  const save = async () => {
    if (!title.trim() || !siteId) {
      setError('Titre et site sont requis.');
      return;
    }
    if (!startTime) {
      setError('Date et heure de début requises.');
      return;
    }
    if (needsUrl && !joinUrl.trim()) {
      setError('URL de participation requise pour cette plateforme.');
      return;
    }
    setSaving(true); setError('');
    try {
      const payload = {
        title: title.trim(),
        provider,
        is_spontaneous: true,
        site: siteId,
        start_time: new Date(startTime).toISOString(),
        duration_minutes: Number(durationMinutes) || 60,
      };
      if (needsUrl) {
        payload.join_url = joinUrl.trim();
        payload.meeting_id = meetingId;
        payload.password = password;
      } else {
        payload.join_url = '';
        payload.meeting_id = '';
        payload.password = '';
      }
      const result = isEdit
        ? await elearningService.updateClassroom(classroom.id, payload)
        : await elearningService.createClassroom(payload);
      onSaved(result);
    } catch (e) {
      setError(e.message || 'Erreur lors de l\'enregistrement.');
    }
    setSaving(false);
  };

  return createPortal(
    <div
      onClick={onClose}
      className="p-2 sm:p-4"
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(8,12,36,0.7)', backdropFilter: 'blur(12px)' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 460, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,0.3)', overflow: 'hidden' }}
      >
        <div className="px-6 py-5" style={{ background: 'linear-gradient(135deg,#ea580c,#db2777)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Zap size={20} color="#fff" />
            </div>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                {isEdit ? 'Modification' : 'Immédiat ou planifié'}
              </p>
              <h2 style={{ color: '#fff', fontSize: 17, fontWeight: 800, margin: 0 }}>
                {isEdit ? 'Modifier la classe spontanée' : 'Classe virtuelle spontanée'}
              </h2>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X size={16} color="#fff" />
          </button>
        </div>

        <div className="p-6" style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 12.5, color: '#64748b', margin: 0, lineHeight: 1.5, background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 12, padding: '10px 14px' }}>
            Ouverte à tous — étudiants, enseignants et personnel administratif du site choisi pourront la rejoindre dès l'heure indiquée ci-dessous, sans inscription préalable à une classe.
          </p>

          <div>
            <FieldLabel required>Titre</FieldLabel>
            <FocusInput value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Réunion générale" />
          </div>

          <div>
            <FieldLabel required>Site</FieldLabel>
            <select value={siteId} onChange={e => setSiteId(e.target.value)} style={{ ...INPUT_BASE, cursor: 'pointer' }}>
              <option value="">Sélectionner un site…</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <FieldLabel required>Date et heure de début</FieldLabel>
            <FocusInput type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} />
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 5 }}>
              Laissez l'heure actuelle pour démarrer immédiatement, ou choisissez une date ultérieure pour la planifier.
            </p>
          </div>

          <div>
            <FieldLabel required>Plateforme</FieldLabel>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PROVIDERS.map(p => {
                const active = provider === p.value;
                return (
                  <button key={p.value} type="button" onClick={() => setProvider(p.value)} style={{
                    padding: '9px 8px', borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                    border: `2px solid ${active ? '#ea580c' : '#e2e8f0'}`,
                    background: active ? '#fff7ed' : '#f8fafc',
                    color: active ? '#c2410c' : '#64748b',
                  }}>
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {needsUrl && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <FieldLabel required>URL de participation</FieldLabel>
                <FocusInput type="url" value={joinUrl} onChange={e => setJoinUrl(e.target.value)}
                  placeholder="https://meet.google.com/…" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <FieldLabel>ID réunion</FieldLabel>
                  <FocusInput value={meetingId} onChange={e => setMeetingId(e.target.value)} placeholder="123 456 7890" />
                </div>
                <div>
                  <FieldLabel>Mot de passe</FieldLabel>
                  <FocusInput value={password} onChange={e => setPassword(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          <div>
            <FieldLabel>Durée (minutes)</FieldLabel>
            <FocusInput type="number" min={15} max={480} value={durationMinutes}
              onChange={e => setDurationMinutes(parseInt(e.target.value) || 60)} />
          </div>
        </div>

        {/* Footer — sticky, always visible regardless of scroll position */}
        <div className="px-6 pt-3 pb-4" style={{ borderTop: '1.5px solid #f0f4f9', background: '#fff', flexShrink: 0 }}>
          {error && (
            <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 12, background: '#fef2f2', border: '1.5px solid #fca5a5', fontSize: 13, color: '#b91c1c' }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: 13, fontWeight: 600, color: '#64748b', cursor: 'pointer' }}>
              Annuler
            </button>
            <button onClick={save} disabled={saving} style={{ padding: '10px 24px', borderRadius: 12, border: 'none', background: saving ? '#fdba74' : 'linear-gradient(135deg,#ea580c,#db2777)', fontSize: 13, fontWeight: 700, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              {saving && <Loader size={14} className="animate-spin" />}
              {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer les modifications' : (new Date(startTime) > new Date() ? 'Planifier la session' : 'Démarrer maintenant')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── LivePanel ────────────────────────────────────────────────────────────────

function LivePanel({ classroom, onClose }) {
  const [tab, setTab] = useState('info');
  const [polls, setPolls] = useState([]);
  const [chat, setChat] = useState([]);
  const [handRaises, setHandRaises] = useState([]);
  const [newPollQ, setNewPollQ] = useState('');
  const [newPollOpts, setNewPollOpts] = useState(['', '']);
  const [chatMsg, setChatMsg] = useState('');
  const [transcript, setTranscript] = useState('');
  const [aiSummary, setAiSummary] = useState(classroom.ai_summary || '');
  const [summarizing, setSummarizing] = useState(false);
  const chatEndRef = useRef();

  const fetchLiveData = async () => {
    try {
      const [p, c, h] = await Promise.all([
        elearningService.getClassroomPolls(classroom.id),
        elearningService.getClassroomChat(classroom.id),
        elearningService.getClassroomHandRaises(classroom.id),
      ]);
      setPolls(p?.results ?? p ?? []);
      setChat(c?.results ?? c ?? []);
      setHandRaises(h?.results ?? h ?? []);
    } catch {}
  };

  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 5000);
    return () => clearInterval(interval);
  }, [classroom.id]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat]);

  const sendChat = async () => {
    if (!chatMsg.trim()) return;
    await elearningService.sendClassroomChat(classroom.id, chatMsg);
    setChatMsg(''); fetchLiveData();
  };

  const createPoll = async () => {
    const opts = newPollOpts.filter(o => o.trim());
    if (!newPollQ.trim() || opts.length < 2) return;
    await elearningService.createClassroomPoll(classroom.id, { question: newPollQ, options: opts });
    setNewPollQ(''); setNewPollOpts(['', '']); fetchLiveData();
  };

  const revealPoll = async (pollId) => {
    await elearningService.revealClassroomPoll(classroom.id, pollId); fetchLiveData();
  };

  const summarize = async () => {
    setSummarizing(true);
    try { const res = await elearningService.aiSummarizeClassroom(classroom.id, transcript); setAiSummary(res.ai_summary); } catch {}
    setSummarizing(false);
  };

  const jitsiUrl = classroom.jitsi_url || classroom.join_url;
  const prov = providerInfo(classroom.provider);

  const TABS = [
    { id: 'info', icon: <Video size={13} />, label: 'Info' },
    { id: 'chat', icon: <MessageSquare size={13} />, label: 'Chat' },
    { id: 'polls', icon: <BarChart2 size={13} />, label: 'Sondages' },
    { id: 'hands', icon: <HandMetal size={13} />, label: `Mains (${handRaises.length})` },
    { id: 'ai', icon: <Zap size={13} />, label: 'IA' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
      <div className="bg-gray-800 text-white px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse flex-shrink-0" />
          <span className="font-semibold text-sm truncate">{classroom.title}</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0" style={{ background: prov.color, color: prov.text }}>{prov.label}</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white flex-shrink-0"><X size={18} /></button>
      </div>
      <div className="flex flex-col lg:flex-row flex-1 min-h-0">
        {/* Video area */}
        <div className="flex-1 min-h-[280px] bg-black flex flex-col">
          {classroom.provider === 'JITSI' && jitsiUrl ? (
            <iframe src={`${jitsiUrl}#config.startWithVideoMuted=false&config.startWithAudioMuted=true`}
              allow="camera; microphone; fullscreen; display-capture; autoplay"
              className="flex-1 w-full" title="Jitsi Meet" />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-white gap-4">
              <Video size={48} className="opacity-30" />
              <div className="text-center">
                <p className="text-gray-300 mb-3">{prov.label}</p>
                {classroom.join_url && (
                  <a href={classroom.join_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700">
                    <ExternalLink size={16} /> Rejoindre la réunion
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
        {/* Side panel */}
        <div className="w-full lg:w-72 h-[50vh] lg:h-auto flex-shrink-0 bg-white flex flex-col border-t lg:border-t-0 lg:border-l border-gray-200">
          <div className="flex border-b overflow-x-auto">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 flex flex-col items-center py-2 text-xs border-b-2 transition-colors flex-shrink-0 ${tab === t.id ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500'}`}>
                {t.icon}<span className="mt-0.5 leading-tight whitespace-nowrap">{t.label}</span>
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {tab === 'info' && (
              <div className="p-4 space-y-3 text-sm">
                <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <p className="text-xs text-gray-400">Plateforme</p>
                  <p className="font-medium">{prov.label}</p>
                  {classroom.meeting_id && <><p className="text-xs text-gray-400 mt-1">ID réunion</p><p className="font-mono text-sm">{classroom.meeting_id}</p></>}
                  {classroom.password && <><p className="text-xs text-gray-400 mt-1">Mot de passe</p><p className="font-mono text-sm">{classroom.password}</p></>}
                </div>
                <div className="space-y-1 text-xs text-gray-500">
                  {classroom.enable_whiteboard && <p>✓ Tableau blanc</p>}
                  {classroom.enable_polls && <p>✓ Sondages</p>}
                  {classroom.enable_chat && <p>✓ Chat</p>}
                  {classroom.enable_hand_raise && <p>✓ Lever la main</p>}
                  {classroom.enable_recording && <p>✓ Enregistrement</p>}
                  {classroom.breakout_rooms > 0 && <p>✓ {classroom.breakout_rooms} salle(s)</p>}
                </div>
              </div>
            )}
            {tab === 'chat' && (
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {chat.map((m, i) => (
                    <div key={i} className="text-sm">
                      <span className="font-medium text-gray-800">{m.sender_name}</span>
                      <span className="text-gray-400 text-xs ml-2">{new Date(m.created_at).toLocaleTimeString('fr')}</span>
                      <p className="text-gray-700 mt-0.5">{m.message}</p>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="p-3 border-t flex gap-2">
                  <input value={chatMsg} onChange={e => setChatMsg(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendChat()}
                    placeholder="Message…" className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none" />
                  <button onClick={sendChat} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg"><Send size={13} /></button>
                </div>
              </div>
            )}
            {tab === 'polls' && (
              <div className="p-4 space-y-4">
                {polls.map(p => (
                  <div key={p.id} className="border border-gray-200 rounded-xl p-3">
                    <p className="text-sm font-medium text-gray-800 mb-2">{p.question}</p>
                    {p.show_results && p.results ? (
                      <div className="space-y-1">
                        {Object.entries(p.results).map(([opt, count]) => {
                          const total = Object.values(p.results).reduce((a, b) => a + b, 0) || 1;
                          const pct = Math.round((count / total) * 100);
                          return (
                            <div key={opt} className="flex items-center gap-2 text-xs">
                              <span className="w-20 text-gray-600 truncate">{opt}</span>
                              <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                                <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-gray-500 w-8 text-right">{pct}%</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {(p.options || []).map((opt, i) => <div key={i} className="text-xs bg-gray-50 px-2 py-1 rounded">{opt}</div>)}
                        <button onClick={() => revealPoll(p.id)} className="mt-2 text-xs text-indigo-600 hover:underline">Révéler les résultats</button>
                      </div>
                    )}
                  </div>
                ))}
                <div className="border border-dashed border-gray-300 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-medium text-gray-600">Nouveau sondage</p>
                  <input value={newPollQ} onChange={e => setNewPollQ(e.target.value)} placeholder="Question…"
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none" />
                  {newPollOpts.map((opt, i) => (
                    <div key={i} className="flex gap-1">
                      <input value={opt} onChange={e => setNewPollOpts(o => o.map((v, j) => j === i ? e.target.value : v))}
                        placeholder={`Option ${i + 1}`} className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs outline-none" />
                      {i >= 2 && <button onClick={() => setNewPollOpts(o => o.filter((_, j) => j !== i))} className="text-red-400"><X size={11} /></button>}
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <button onClick={() => setNewPollOpts(o => [...o, ''])} className="text-xs text-gray-500">+ Option</button>
                    <button onClick={createPoll} className="ml-auto text-xs bg-indigo-600 text-white px-3 py-1 rounded-lg">Lancer</button>
                  </div>
                </div>
              </div>
            )}
            {tab === 'hands' && (
              <div className="p-4 space-y-2">
                {handRaises.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center mt-4">Aucune main levée</p>
                ) : handRaises.map(h => (
                  <div key={h.id} className="flex items-center gap-3 bg-yellow-50 rounded-xl px-3 py-2">
                    <HandMetal size={15} className="text-yellow-600" />
                    <div>
                      <p className="text-sm font-medium">{h.student_name}</p>
                      <p className="text-xs text-gray-400">{new Date(h.raised_at).toLocaleTimeString('fr')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {tab === 'ai' && (
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transcription</label>
                  <textarea rows={6} value={transcript} onChange={e => setTranscript(e.target.value)}
                    placeholder="Collez la transcription ici…"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none outline-none" />
                  <button onClick={summarize} disabled={summarizing || !transcript.trim()}
                    className="mt-2 w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 rounded-xl text-sm disabled:opacity-50">
                    {summarizing ? <Loader size={13} className="animate-spin" /> : <Zap size={13} />} Résumé IA
                  </button>
                </div>
                {aiSummary && (
                  <div className="bg-indigo-50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-indigo-700 mb-1">Résumé</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{aiSummary}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ChatPanel ────────────────────────────────────────────────────────────────

function ChatPanel({ classroom, onClose }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef();

  const load = async () => {
    try { const res = await elearningService.getClassroomChat(classroom.id); setMessages(res?.results ?? res ?? []); } catch {}
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [classroom.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try { await elearningService.sendClassroomChat(classroom.id, text); setText(''); await load(); } catch {}
    setSending(false);
  };

  const started = new Date(classroom.start_time) <= new Date();
  const ended = classroom.is_ended;
  const statusLabel = ended ? 'Terminée' : started ? 'En cours' : 'Planifiée';
  const statusColor = ended ? '#64748b' : started ? '#16a34a' : '#2563eb';

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9998, display: 'flex', background: 'rgba(8,12,36,0.5)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div className="w-full sm:w-[380px]" style={{ marginLeft: 'auto', height: '100%', background: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
        <div className="gap-3" style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="min-w-0">
            <div className="min-w-0" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <p className="truncate" style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: 0 }}>{classroom.title}</p>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${statusColor}15`, color: statusColor, flexShrink: 0 }}>{statusLabel}</span>
            </div>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: '3px 0 0' }}>
              {ended ? 'Chat archivé' : started ? 'Chat en direct' : 'Chat différé'}
            </p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, border: 'none', background: '#f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X size={15} color="#64748b" />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <MessageSquare size={32} color="#c7d2fe" />
              <p style={{ fontSize: 13, color: '#94a3b8' }}>Aucun message</p>
            </div>
          ) : messages.map((m, i) => (
            <div key={i}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#6366f1' }}>{m.sender_name || m.sender || 'Inconnu'}</span>
                <span style={{ fontSize: 10, color: '#94a3b8' }}>{m.created_at ? new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
              </div>
              <div style={{ borderRadius: '16px 16px 16px 4px', padding: '8px 12px', background: '#f0f4ff', fontSize: 13, color: '#1e293b', lineHeight: 1.5 }}>
                {m.message || m.content || m.text}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <div style={{ padding: 12, borderTop: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder={ended ? 'Session terminée' : 'Écrire un message…'}
              style={{ flex: 1, borderRadius: 12, padding: '8px 12px', fontSize: 13, border: '1.5px solid #e2e8f0', outline: 'none', background: '#fff' }} />
            <button onClick={send} disabled={sending || !text.trim()}
              style={{ width: 36, height: 36, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: sending || !text.trim() ? 0.4 : 1 }}>
              <Send size={13} color="#fff" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  live:     { label: 'En cours',  bg: '#dcfce7', color: '#15803d', dot: '#22c55e', bar: 'linear-gradient(90deg,#22c55e,#16a34a)' },
  upcoming: { label: 'Planifiée', bg: '#e0e7ff', color: '#3730a3', dot: null,       bar: 'linear-gradient(90deg,#6366f1,#4f46e5)' },
  ended:    { label: 'Terminée',  bg: '#f1f5f9', color: '#64748b', dot: null,       bar: 'linear-gradient(90deg,#cbd5e1,#94a3b8)' },
};

function ClassroomCard({ cr, onOpen, onChat, onEdit, onDelete, onEnd }) {
  const st = getStatus(cr);
  const s = STATUS_CFG[st];
  const prov = providerInfo(cr.provider);
  const dateStr = cr.start_time ? new Date(cr.start_time).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const timeStr = cr.start_time ? new Date(cr.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column', border: st === 'live' ? '2px solid #86efac' : '1.5px solid #f0f4f9', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', transition: 'box-shadow 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)'; }}>
      {/* Color bar */}
      <div style={{ height: 5, background: s.bar, flexShrink: 0 }} />

      <div style={{ padding: '18px 18px 16px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        {/* Row 1: icon + status */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ width: 42, height: 42, borderRadius: 13, background: st === 'live' ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'linear-gradient(135deg,#eef2ff,#e0e7ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Video size={19} color={st === 'live' ? '#fff' : '#6366f1'} />
          </div>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 99, background: s.bg, color: s.color, flexShrink: 0 }}>
            {s.dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />}
            {s.label}
          </span>
        </div>

        {/* Title + meta */}
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: '0 0 4px', lineHeight: 1.35 }}>{cr.title}</p>
          <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 8px', fontWeight: 500 }}>
            {cr.is_spontaneous ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Globe size={11} /> Ouverte à tous — {cr.site_name || 'tous les sites'}
              </span>
            ) : (
              `${cr.class_name || '—'} · ${cr.subject_name || '—'}`
            )}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>
              <Calendar size={10} /> {dateStr} {timeStr && `· ${timeStr}`}
            </span>
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: prov.color, color: prov.text }}>{prov.label}</span>
            {cr.is_spontaneous && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#ffedd5', color: '#9a3412' }}>Spontanée</span>
            )}
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{cr.duration_minutes} min</span>
            {cr.polls_count > 0 && <span style={{ fontSize: 11, color: '#94a3b8' }}>{cr.polls_count} sondage{cr.polls_count > 1 ? 's' : ''}</span>}
          </div>
        </div>

        {cr.ai_summary && (
          <p style={{ fontSize: 11, background: '#eef2ff', color: '#4338ca', borderRadius: 10, padding: '6px 10px', margin: 0, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {cr.ai_summary}
          </p>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', paddingTop: 10, borderTop: '1.5px solid #f0f4f9', marginTop: 'auto' }}>
          {st !== 'ended' && (
            <button onClick={onOpen} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px 0', borderRadius: 11, border: 'none', fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer', background: st === 'live' ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
              <Play size={12} /> Ouvrir
            </button>
          )}
          <button onClick={onChat} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 10px', borderRadius: 11, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', background: '#f0f4ff', color: '#4f46e5', flexShrink: 0 }}>
            <MessageSquare size={12} /> {st === 'live' ? 'Live' : st === 'ended' ? 'Archives' : 'Différé'}
          </button>
          {st === 'live' && (
            <button onClick={onEnd} title="Terminer" style={{ width: 34, height: 34, borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff7ed', color: '#ea580c', flexShrink: 0 }}>
              <StopCircle size={14} />
            </button>
          )}
          <button onClick={onEdit} title="Modifier" style={{ width: 34, height: 34, borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#64748b', flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.background = '#dbeafe'; e.currentTarget.style.color = '#2563eb'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#64748b'; }}>
            <Edit2 size={13} />
          </button>
          <button onClick={onDelete} title="Supprimer" style={{ width: 34, height: 34, borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff1f2', color: '#f43f5e', flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff1f2'; e.currentTarget.style.color = '#f43f5e'; }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function VirtualClassroomManager({ classesList, subjectsList } = {}) {
  const [search, setSearch] = useState('');
  const [filterProvider, setFilterProvider] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [spontaneousOpen, setSpontaneousOpen] = useState(false);
  const [editingSpontaneous, setEditingSpontaneous] = useState(null);
  const [liveClassroom, setLiveClassroom] = useState(null);
  const [chatClassroom, setChatClassroom] = useState(null);
  const confirm = useConfirm();
  const { sites, selectedSite } = useSite();

  // Blocks any onChange fired by browser autofill for 700ms after modal closes
  const blockSearchRef = useRef(false);

  const { data: classroomsData, loading, refetch } = useApi(() => elearningService.getClassrooms({ page_size: 200 }), []);
  // Backend already scopes classrooms/classes/subjects to the teacher's own
  // assignments when a teacher is authenticated, so a plain fetch here is
  // enough — no client-side filtering needed. Callers (e.g. the teacher
  // space) may still pass classesList/subjectsList explicitly to skip the
  // extra requests when they already have that data loaded.
  const { data: classesData }  = useApi(() => academicService.getClasses({ page_size: 500 }), [], !classesList);
  const { data: subjectsData } = useApi(() => academicService.getSubjects({ page_size: 500 }), [], !subjectsList);

  const classrooms = classroomsData?.results ?? classroomsData ?? [];
  const classes    = classesList  ?? (classesData?.results  ?? classesData  ?? []);
  const subjects   = subjectsList ?? (subjectsData?.results ?? subjectsData ?? []);

  const closeModal = (andRefetch = false) => {
    setModalOpen(false);
    setEditing(null);
    // Block autofill for 700ms so browser cannot refill the search input
    blockSearchRef.current = true;
    setSearch('');
    setTimeout(() => { blockSearchRef.current = false; }, 700);
    if (andRefetch) refetch();
  };

  const openEdit = (cr) => {
    blockSearchRef.current = true;
    setSearch('');
    setTimeout(() => { blockSearchRef.current = false; }, 300);
    if (cr.is_spontaneous) {
      setEditingSpontaneous(cr);
      setSpontaneousOpen(true);
    } else {
      setEditing(cr);
      setModalOpen(true);
    }
  };

  const handleSearchChange = (e) => {
    if (blockSearchRef.current) return;
    setSearch(e.target.value);
  };

  const filtered = classrooms.filter(c => {
    const match = !search || c.title.toLowerCase().includes(search.toLowerCase());
    const prov  = !filterProvider || c.provider === filterProvider;
    return match && prov;
  });

  const liveCount = classrooms.filter(c => getStatus(c) === 'live').length;

  const handleDelete = async (cr) => {
    if (!await confirm({ title: 'Supprimer cette session ?', message: 'Cette action est irréversible.', confirmLabel: 'Supprimer', destructive: true })) return;
    await elearningService.deleteClassroom(cr.id);
    refetch();
  };

  const handleEnd = async (id) => {
    await elearningService.endClassroom(id);
    refetch();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div className="flex-wrap" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div className="min-w-0">
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>Classes virtuelles</h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4, marginBottom: 0 }}>Gérez vos sessions d'apprentissage en direct</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flexShrink: 0 }}>
          <button
            onClick={() => { setEditingSpontaneous(null); setSpontaneousOpen(true); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#ea580c,#db2777)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(234,88,12,0.35)' }}>
            <Zap size={15} /> Classe virtuelle spontanée
          </button>
          <button
            onClick={() => { setEditing(null); setModalOpen(true); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}>
            <Plus size={15} /> Nouvelle session
          </button>
        </div>
      </div>

      {/* Live banner */}
      {liveCount > 0 && (
        <div style={{ borderRadius: 16, padding: '14px 18px', background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '1.5px solid #86efac', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 11, background: 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Wifi size={16} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#15803d', margin: 0 }}>
              {liveCount} session{liveCount > 1 ? 's' : ''} en cours actuellement
            </p>
            <p style={{ fontSize: 11, color: '#4ade80', margin: '2px 0 0' }}>Des classes virtuelles sont actives</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={handleSearchChange}
          placeholder="Rechercher une session…"
          autoComplete="off"
          data-lpignore="true"
          data-form-type="other"
          className="w-full sm:flex-1 sm:min-w-[200px]"
          style={{ padding: '10px 14px', borderRadius: 14, border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none', background: '#fff', color: '#0f172a' }}
          onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
          onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
        />
        <select value={filterProvider} onChange={e => setFilterProvider(e.target.value)}
          className="w-full sm:w-auto"
          style={{ padding: '10px 14px', borderRadius: 14, border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none', background: '#fff', cursor: 'pointer', color: '#374151' }}>
          <option value="">Toutes les plateformes</option>
          {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      {/* Count */}
      <p style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', margin: '-10px 0 0' }}>
        {classroomsData?.count ?? classrooms.length} session{(classroomsData?.count ?? classrooms.length) !== 1 ? 's' : ''} au total
        {search && ` · ${filtered.length} résultat${filtered.length !== 1 ? 's' : ''}`}
      </p>

      {/* Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: '4px solid #e0e7ff', borderTopColor: '#6366f1', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 0', borderRadius: 20, border: '1.5px dashed #e2e8f0' }}>
          <Video size={48} color="#c7d2fe" style={{ marginBottom: 12, opacity: 0.6 }} />
          <p style={{ fontSize: 14, fontWeight: 700, color: '#64748b', margin: '0 0 6px' }}>
            {search ? 'Aucune session correspondante' : 'Aucune classe virtuelle'}
          </p>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 18px' }}>
            {search ? 'Essayez un autre terme' : 'Planifiez votre première session en ligne'}
          </p>
          {!search && (
            <button onClick={() => { setEditing(null); setModalOpen(true); }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              <Plus size={14} /> Nouvelle session
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 18 }}>
          {filtered.map(cr => (
            <ClassroomCard
              key={cr.id}
              cr={cr}
              onOpen={() => setLiveClassroom(cr)}
              onChat={() => setChatClassroom(cr)}
              onEdit={() => openEdit(cr)}
              onDelete={() => handleDelete(cr)}
              onEnd={() => handleEnd(cr.id)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {modalOpen && (
        <ClassroomModal
          classroom={editing}
          classes={classes}
          subjects={subjects}
          onClose={() => closeModal(false)}
          onSaved={() => closeModal(true)}
        />
      )}
      {spontaneousOpen && (
        <SpontaneousModal
          classroom={editingSpontaneous}
          sites={sites}
          defaultSiteId={selectedSite !== 'all' ? selectedSite : (sites[0]?.id || '')}
          onClose={() => { setSpontaneousOpen(false); setEditingSpontaneous(null); }}
          onSaved={(saved) => {
            const wasEdit = !!editingSpontaneous;
            setSpontaneousOpen(false);
            setEditingSpontaneous(null);
            refetch();
            if (!wasEdit) setLiveClassroom(saved);
          }}
        />
      )}
      {liveClassroom && <LivePanel classroom={liveClassroom} onClose={() => setLiveClassroom(null)} />}
      {chatClassroom && <ChatPanel classroom={chatClassroom} onClose={() => setChatClassroom(null)} />}
    </div>
  );
}
