import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  BookOpen, Video, ClipboardList, ClipboardCheck, Shield, FlaskConical,
  Library, Bot, Film, LayoutDashboard, Layers, Play, ExternalLink, Upload,
  CheckCircle2, Clock, ChevronLeft, ChevronRight, FileText, X, AlertCircle,
  Send, Users, Calendar, MonitorPlay, Award, CheckCircle, ArrowRight,
  HandMetal, MessageSquare, BarChart2, Wifi, WifiOff, Download,
  BookMarked, Paperclip, Image as ImageIcon, Music, Type, Link2,
} from 'lucide-react';
import { elearningService } from '../../services/elearning';
import { studentsService } from '../../services/students';
import { gradesService } from '../../services/grades';
import { useApi } from '../../hooks/useApi';
import { useNotifications } from '../../components/Notifications';

const C = '#db2777'; const C_BG = '#fdf2f8'; const C_ICON = '#fce7f3';

// ─── Utilitaires ─────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="h-9 w-9 rounded-full border-[3px] animate-spin" style={{ borderColor: C_ICON, borderTopColor: C }} />
      <p className="text-sm font-semibold" style={{ color: '#64748b' }}>Chargement…</p>
    </div>
  );
}

function Empty({ icon: Icon, text, sub }) {
  return (
    <div className="flex flex-col items-center py-16 rounded-2xl" style={{ border: '1.5px dashed #e2e8f0' }}>
      <Icon className="h-10 w-10 mb-3 opacity-30" style={{ color: C }} />
      <p className="text-sm font-bold" style={{ color: '#64748b' }}>{text}</p>
      {sub && <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>{sub}</p>}
    </div>
  );
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function classroomStatus(c) {
  const now = new Date();
  const start = new Date(c.start_time);
  const end = new Date(start.getTime() + (c.duration_minutes || 60) * 60000);
  if (now < start) return 'upcoming';
  if (now <= end) return 'live';
  return 'ended';
}

// ─── SIDEBAR CONFIG ───────────────────────────────────────────────────────────

const SIDEBAR_GROUPS = [
  { label: 'Général', items: [
    { id: 'accueil',    label: 'Accueil',            icon: LayoutDashboard },
  ]},
  { label: 'Cours & Leçons', items: [
    { id: 'cours',      label: 'Cours en ligne',     icon: Layers },
    { id: 'lecons',     label: 'Mes leçons',         icon: BookOpen },
    { id: 'videoteque', label: 'Vidéothèque',        icon: Film },
  ]},
  { label: 'Sessions live', items: [
    { id: 'classes-virt', label: 'Classes virtuelles', icon: MonitorPlay },
  ]},
  { label: 'Évaluation', items: [
    { id: 'devoirs',    label: 'Mes devoirs',        icon: ClipboardList },
    { id: 'quiz',       label: 'Quiz',               icon: ClipboardCheck },
    { id: 'examens',    label: 'Examens',            icon: Shield },
    { id: 'labos',      label: 'Laboratoires',       icon: FlaskConical },
    { id: 'notes',      label: 'Notes & Bulletins',  icon: Award },
  ]},
  { label: 'Ressources', items: [
    { id: 'bibliotheque', label: 'Bibliothèque',     icon: Library },
    { id: 'ia',           label: 'Tuteur IA',        icon: Bot },
  ]},
];

// ─── VIRTUAL CLASSROOMS ───────────────────────────────────────────────────────

function StudentLiveModal({ classroom, onClose }) {
  const [chatMessages, setChatMessages] = useState([]);
  const [msg, setMsg] = useState('');
  const [handRaised, setHandRaised] = useState(false);
  const [tab, setTab] = useState('video');
  const chatEndRef = useRef();
  const status = classroomStatus(classroom);
  const jitsiUrl = classroom.provider === 'JITSI' ? (classroom.jitsi_url || classroom.join_url) : null;

  const fetchChat = useCallback(async () => {
    try {
      const res = await elearningService.getClassroomChat(classroom.id);
      setChatMessages(res?.results ?? res ?? []);
    } catch {}
  }, [classroom.id]);

  useEffect(() => {
    fetchChat();
    const interval = setInterval(fetchChat, 5000);
    return () => clearInterval(interval);
  }, [fetchChat]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const sendChat = async () => {
    if (!msg.trim()) return;
    await elearningService.sendClassroomChat(classroom.id, msg.trim());
    setMsg(''); fetchChat();
  };

  const toggleHand = async () => {
    try {
      if (handRaised) await elearningService.lowerHand(classroom.id);
      else await elearningService.raiseHand(classroom.id);
      setHandRaised(v => !v);
    } catch {}
  };

  return createPortal(
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
      <div className="bg-gray-800 text-white px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: status === 'live' ? '#4ade80' : '#94a3b8' }} />
        <span className="font-bold text-sm">{classroom.title}</span>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: status === 'live' ? '#16a34a30' : '#64748b30', color: status === 'live' ? '#4ade80' : '#94a3b8' }}>
          {status === 'live' ? 'EN DIRECT' : 'TERMINÉE'}
        </span>
        <div className="flex-1" />
        <button onClick={toggleHand} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${handRaised ? 'bg-amber-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
          <HandMetal className="h-3.5 w-3.5" /> {handRaised ? 'Main levée' : 'Lever la main'}
        </button>
        <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-all">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Video area */}
        <div className="flex-1 bg-black flex flex-col">
          {classroom.provider === 'JITSI' && jitsiUrl ? (
            <iframe src={`${jitsiUrl}#config.startWithVideoMuted=false&config.startWithAudioMuted=true`}
              allow="camera; microphone; fullscreen; display-capture; autoplay"
              className="flex-1 w-full" title="Jitsi Meet" />
          ) : classroom.provider === 'MEET' ? (
            /* Google Meet — cannot be embedded (X-Frame-Options), open in new tab */
            <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
              {/* Google Meet logo */}
              <div className="h-20 w-20 rounded-2xl flex items-center justify-center flex-shrink-0"
                   style={{ background: '#fff', boxShadow: '0 4px 20px #0004' }}>
                <svg viewBox="0 0 48 48" className="h-12 w-12">
                  <path fill="#00832d" d="M23.987 24.187l4.586 5.237 6.184-4.55.74-11.141-6.924-.028z"/>
                  <path fill="#0066da" d="M0 31.191V40.5c0 1.93 1.57 3.5 3.5 3.5h9.309l1.916-9.451-1.916-3.358H0z"/>
                  <path fill="#e94235" d="M12.809 4H3.5C1.57 4 0 5.57 0 7.5v23.691h13.809V4z" opacity=".9"/>
                  <path fill="#2684fc" d="M12.809 24.187H0V31.5h13.809z"/>
                  <path fill="#00ac47" d="M34.757 8.42L24.686 16.7h-11.877v14.8h11.877l10.071 8.28V8.42z"/>
                  <path fill="#ffba00" d="M34.757 8.42L48 18.1V29.7L34.757 39.78V8.42z"/>
                </svg>
              </div>
              <div className="text-center space-y-2">
                <p className="text-white font-black text-lg">{classroom.title}</p>
                <p className="text-gray-400 text-sm">Cette session utilise Google Meet</p>
              </div>
              {classroom.join_url ? (
                <a href={classroom.join_url} target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-black text-base transition-all hover:scale-105"
                   style={{ background: 'linear-gradient(135deg,#1a73e8,#0d47a1)', boxShadow: '0 4px 20px #1a73e840' }}>
                  <ExternalLink className="h-5 w-5" /> Rejoindre Google Meet
                </a>
              ) : (
                <p className="text-gray-500 text-sm">Lien de réunion non configuré</p>
              )}
              {classroom.meeting_id && (
                <p className="text-gray-600 text-xs">
                  Code : <span className="font-mono font-bold text-gray-400">{classroom.meeting_id}</span>
                </p>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-white gap-5">
              <MonitorPlay className="h-16 w-16 opacity-30" />
              <div className="text-center space-y-3">
                <p className="text-gray-300 text-sm">{classroom.title}</p>
                {classroom.join_url && (
                  <a href={classroom.join_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 font-semibold transition-all">
                    <ExternalLink className="h-4 w-4" /> Rejoindre la réunion
                  </a>
                )}
                {classroom.meeting_id && (
                  <p className="text-gray-500 text-xs">ID : {classroom.meeting_id}{classroom.password ? ` · Mdp : ${classroom.password}` : ''}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Side panel */}
        {classroom.enable_chat && (
          <div className="w-72 bg-white flex flex-col border-l border-gray-200">
            <div className="flex border-b border-gray-100">
              {['video', 'chat'].map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className="flex-1 py-2.5 text-xs font-bold transition-all"
                  style={{ color: tab === t ? C : '#94a3b8', borderBottom: tab === t ? `2px solid ${C}` : '2px solid transparent' }}>
                  {t === 'video' ? 'Info' : 'Chat'}
                </button>
              ))}
            </div>
            {tab === 'chat' ? (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {chatMessages.map((m, i) => (
                    <div key={i} className="space-y-0.5">
                      <p className="text-[10px] font-bold" style={{ color: '#94a3b8' }}>{m.sender_name || 'Anonyme'}</p>
                      <p className="text-xs bg-gray-50 rounded-xl px-3 py-2" style={{ color: '#1e293b' }}>{m.message}</p>
                    </div>
                  ))}
                  {chatMessages.length === 0 && <p className="text-center text-xs py-4" style={{ color: '#94a3b8' }}>Aucun message</p>}
                  <div ref={chatEndRef} />
                </div>
                <div className="p-2 border-t flex gap-2">
                  <input value={msg} onChange={e => setMsg(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendChat()}
                    placeholder="Écrire un message…" className="flex-1 text-xs rounded-lg px-3 py-2 focus:outline-none"
                    style={{ border: '1.5px solid #f0f4f9', background: '#f8fafc' }} />
                  <button onClick={sendChat} className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white"
                    style={{ background: C }}>
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-3 text-sm">
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">Classe</p>
                  <p className="font-semibold text-gray-700">{classroom.class_name || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">Début</p>
                  <p className="font-semibold text-gray-700">{formatDateTime(classroom.start_time)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">Durée</p>
                  <p className="font-semibold text-gray-700">{classroom.duration_minutes} min</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// ─── STUDENT CHAT PANEL ──────────────────────────────────────────────────────

function StudentChatPanel({ classroom, onClose }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef();

  const load = async () => {
    try {
      const res = await elearningService.getClassroomChat(classroom.id);
      setMessages(res?.results ?? res ?? []);
    } catch {}
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
    try {
      await elearningService.sendClassroomChat(classroom.id, text);
      setText(''); await load();
    } catch {} finally { setSending(false); }
  };

  const st = classroomStatus(classroom);
  const statusLabel = st === 'live' ? 'En cours' : st === 'upcoming' ? 'Planifiée' : 'Terminée';

  return createPortal(
    <div className="fixed inset-0 z-50 flex" style={{ background: 'rgba(8,12,36,0.6)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div className="ml-auto h-full w-96 bg-white flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <div>
            <p className="text-sm font-extrabold" style={{ color: '#0f172a' }}>{classroom.title}</p>
            <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
              {st === 'live' ? 'Chat en direct' : st === 'upcoming' ? 'Chat différé — session à venir' : 'Historique du chat'}
              {' · '}{statusLabel}
            </p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ color: '#64748b' }}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <MessageSquare className="h-8 w-8 opacity-20" style={{ color: C }} />
              <p className="text-sm" style={{ color: '#94a3b8' }}>
                {st === 'upcoming' ? 'Laissez un message avant la session' : 'Aucun message'}
              </p>
            </div>
          ) : messages.map((m, i) => (
            <div key={i} className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold" style={{ color: C }}>{m.sender_name || m.sender || 'Inconnu'}</span>
                <span className="text-[10px]" style={{ color: '#94a3b8' }}>
                  {m.created_at ? new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
              <div className="rounded-2xl rounded-tl-none px-3 py-2 text-sm" style={{ background: C_BG, color: '#1e293b' }}>
                {m.message || m.content || m.text}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <div className="p-3" style={{ borderTop: '1px solid #f1f5f9' }}>
          <div className="flex gap-2">
            <input value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Écrire un message…"
              className="flex-1 rounded-xl px-3 py-2 text-sm border outline-none"
              style={{ borderColor: '#e2e8f0' }} />
            <button onClick={send} disabled={sending || !text.trim()}
              className="h-9 w-9 rounded-xl flex items-center justify-center text-white disabled:opacity-40"
              style={{ background: `linear-gradient(135deg,${C},${C}cc)` }}>
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── CLASSES VIRTUELLES ───────────────────────────────────────────────────────

function VirtualClassroomsTab({ classId }) {
  const [liveRoom, setLiveRoom] = useState(null);
  const [chatRoom, setChatRoom] = useState(null);
  const { data, loading, refetch } = useApi(
    () => classId ? elearningService.getClassrooms({ class_obj: classId, page_size: 50 }) : Promise.resolve({ results: [] }),
    [classId], !!classId
  );
  const classrooms = (data?.results ?? data ?? []).slice().sort((a, b) => new Date(b.start_time) - new Date(a.start_time));

  useEffect(() => {
    const i = setInterval(refetch, 30000);
    return () => clearInterval(i);
  }, [refetch]);

  const STATUS_STYLES = {
    live: { label: 'EN DIRECT', bg: '#d1fae5', color: '#059669', dot: '#22c55e' },
    upcoming: { label: 'À VENIR', bg: '#dbeafe', color: '#2563eb', dot: '#60a5fa' },
    ended: { label: 'TERMINÉE', bg: '#f1f5f9', color: '#64748b', dot: '#94a3b8' },
  };

  if (loading && !classrooms.length) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: C_ICON }}>
          <MonitorPlay className="h-5 w-5" style={{ color: C }} />
        </div>
        <div>
          <h2 className="text-base font-extrabold" style={{ color: '#0f172a' }}>Classes virtuelles</h2>
          <p className="text-xs font-semibold" style={{ color: '#94a3b8' }}>Rejoignez vos sessions en direct</p>
        </div>
      </div>

      {classrooms.length === 0 ? (
        <Empty icon={MonitorPlay} text="Aucune classe virtuelle disponible" sub="Revenez plus tard" />
      ) : (
        <div className="grid gap-3">
          {classrooms.map(c => {
            const st = classroomStatus(c);
            const s = STATUS_STYLES[st];
            return (
              <div key={c.id} className="rounded-2xl p-4 flex items-center gap-4" style={{ border: '1.5px solid #f0f4f9', background: st === 'live' ? '#f0fdf4' : '#fff' }}>
                <div className="h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: C_ICON }}>
                  <MonitorPlay className="h-5 w-5" style={{ color: C }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-extrabold" style={{ color: '#0f172a' }}>{c.title}</p>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: s.bg, color: s.color }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
                      {s.label}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                    <Calendar className="inline h-3 w-3 mr-1" />{formatDateTime(c.start_time)} · {c.duration_minutes} min
                  </p>
                  {c.subject_name && <p className="text-xs" style={{ color: '#94a3b8' }}>{c.subject_name}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                  {st === 'live' && (
                    <button onClick={() => setLiveRoom(c)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
                      style={{ background: 'linear-gradient(135deg,#059669,#10b981)', boxShadow: '0 4px 14px #05966940' }}>
                      <Wifi className="h-4 w-4" /> Rejoindre
                    </button>
                  )}
                  {st === 'upcoming' && (
                    <span className="text-xs font-bold px-3 py-1.5 rounded-xl" style={{ background: '#dbeafe', color: '#2563eb' }}>
                      <Clock className="inline h-3 w-3 mr-1" />Bientôt
                    </span>
                  )}
                  {st === 'ended' && c.recording_url && (
                    <a href={c.recording_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
                      style={{ background: '#f1f5f9', color: '#475569' }}>
                      <Play className="h-4 w-4" /> Revoir
                    </a>
                  )}
                  {st === 'ended' && !c.recording_url && (
                    <span className="text-xs font-semibold px-3 py-1.5 rounded-xl" style={{ background: '#f1f5f9', color: '#94a3b8' }}>
                      <WifiOff className="inline h-3 w-3 mr-1" />Terminée
                    </span>
                  )}
                  <button onClick={() => setChatRoom(c)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
                    style={{ background: C_BG, color: C }}>
                    <MessageSquare className="h-3.5 w-3.5" /> Discussion
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {liveRoom && <StudentLiveModal classroom={liveRoom} onClose={() => setLiveRoom(null)} />}
      {chatRoom && <StudentChatPanel classroom={chatRoom} onClose={() => setChatRoom(null)} />}
    </div>
  );
}

// ─── DEVOIRS (ASSIGNMENTS) ────────────────────────────────────────────────────

// ─── INLINE QUIZ FOR ASSIGNMENT ──────────────────────────────────────────────

function AssignmentQuizSection({ quizId, notify }) {
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [starting, setStarting] = useState(false);

  const start = async () => {
    setStarting(true);
    try {
      const res = await elearningService.startQuizAttempt(quizId);
      const a = res?.data ?? res;
      setAttempt(a);
      setAnswers({});
    } catch (e) {
      notify({ type: 'error', title: 'Erreur', message: e.message || 'Impossible de démarrer' });
    } finally { setStarting(false); }
  };

  const setAnswer = (qId, val) => setAnswers(prev => ({ ...prev, [qId]: val }));

  const submit = async () => {
    setSubmitting(true);
    try {
      const payload = Object.entries(answers).map(([questionId, ans]) => ({
        question: parseInt(questionId),
        selected_choices: ans.choice_ids || [],
        text_answer: ans.text || '',
      }));
      const res = await elearningService.submitQuizAttempt(attempt.id, payload);
      setResult(res?.data ?? res);
      notify({ type: 'success', title: 'Exercice soumis', message: `Score : ${res?.score_percent ?? 0}%` });
    } catch (e) {
      notify({ type: 'error', title: 'Erreur', message: e.message || 'Erreur lors de la soumission' });
    } finally { setSubmitting(false); }
  };

  if (!attempt && !result) {
    return (
      <div className="rounded-2xl p-5 space-y-3" style={{ border: '1.5px solid #ede9fe', background: '#faf5ff' }}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#ede9fe' }}>
            <ClipboardCheck className="h-5 w-5" style={{ color: '#7c3aed' }} />
          </div>
          <div>
            <p className="text-sm font-extrabold" style={{ color: '#0f172a' }}>Exercices en ligne</p>
            <p className="text-xs" style={{ color: '#94a3b8' }}>Répondez aux questions directement depuis cette page</p>
          </div>
        </div>
        <button onClick={start} disabled={starting}
          className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow: '0 4px 14px #7c3aed30' }}>
          {starting ? 'Démarrage…' : 'Commencer les exercices'}
        </button>
      </div>
    );
  }

  if (result) {
    return (
      <div className="rounded-2xl p-5 space-y-3" style={{ border: '1.5px solid #d1fae5', background: '#f0fdf4' }}>
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 flex-shrink-0" style={{ color: '#059669' }} />
          <div>
            <p className="text-sm font-extrabold" style={{ color: '#0f172a' }}>Exercices terminés !</p>
            <p className="text-xl font-black" style={{ color: '#059669' }}>
              {result.score_percent ?? result.percentage ?? '—'}%
              <span className="text-sm font-bold text-gray-500 ml-2">{result.points_earned ?? '?'} / {result.total_points ?? '?'} pts</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const questions = attempt?.questions ?? [];

  const renderQuestion = (q) => {
    const ans = answers[q.id] || {};
    if (q.question_type === 'TRUEFALSE') {
      return (
        <div className="flex gap-3">
          {(q.choices || []).map(c => {
            const isVrai = c.text === 'Vrai';
            const sel = (ans.choice_ids || []).includes(c.id);
            return (
              <button key={c.id} onClick={() => setAnswer(q.id, { choice_ids: [c.id] })}
                className="flex-1 py-4 rounded-xl border-2 text-sm font-bold transition-all"
                style={{
                  background: sel ? (isVrai ? '#d1fae5' : '#fee2e2') : '#f8fafc',
                  borderColor: sel ? (isVrai ? '#059669' : '#ef4444') : '#e2e8f0',
                  color: sel ? (isVrai ? '#059669' : '#ef4444') : '#64748b',
                }}>
                {isVrai ? '✓ Vrai' : '✗ Faux'}
              </button>
            );
          })}
        </div>
      );
    }
    if (q.question_type === 'TEXT') {
      return (
        <textarea value={ans.text || ''} onChange={e => setAnswer(q.id, { text: e.target.value })}
          rows={3} placeholder="Votre réponse…"
          className="w-full rounded-xl px-4 py-3 text-sm border outline-none resize-none"
          style={{ borderColor: '#e2e8f0' }} />
      );
    }
    return (
      <div className="space-y-2">
        {(q.choices || []).map(c => {
          const sel = (ans.choice_ids || []).includes(c.id);
          const multi = q.question_type === 'QCM';
          return (
            <button key={c.id} onClick={() => {
              if (multi) {
                const cur = ans.choice_ids || [];
                setAnswer(q.id, { choice_ids: sel ? cur.filter(x => x !== c.id) : [...cur, c.id] });
              } else {
                setAnswer(q.id, { choice_ids: [c.id] });
              }
            }}
              className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all"
              style={{ background: sel ? '#fdf2f8' : '#f8fafc', borderColor: sel ? C : '#e2e8f0', color: sel ? C : '#64748b' }}>
              <span className="h-5 w-5 rounded flex items-center justify-center flex-shrink-0 border-2"
                style={{ borderColor: sel ? C : '#e2e8f0', background: sel ? C : 'transparent' }}>
                {sel && <CheckCircle2 className="h-3 w-3 text-white" />}
              </span>
              {c.text}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="rounded-2xl p-5 space-y-5" style={{ border: '1.5px solid #ede9fe' }}>
      <p className="text-sm font-extrabold" style={{ color: '#0f172a' }}>Exercices en ligne — {questions.length} question{questions.length > 1 ? 's' : ''}</p>
      {questions.map((q, idx) => (
        <div key={q.id} className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-extrabold flex-shrink-0" style={{ background: '#ede9fe', color: '#7c3aed' }}>{idx + 1}</span>
            <div className="flex-1">
              <p className="text-sm font-semibold mb-2" style={{ color: '#0f172a' }}>{q.text}</p>
              {renderQuestion(q)}
            </div>
          </div>
          {idx < questions.length - 1 && <div style={{ borderTop: '1px solid #f1f5f9' }} />}
        </div>
      ))}
      <button onClick={submit} disabled={submitting}
        className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow: '0 4px 14px #7c3aed30' }}>
        {submitting ? 'Envoi en cours…' : 'Soumettre les réponses'}
      </button>
    </div>
  );
}

function AssignmentDetail({ assignment, onBack }) {
  const { notify } = useNotifications();
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef();

  const { data: subsData, loading: loadSubs, refetch: refetchSubs } = useApi(
    () => elearningService.getSubmissions(assignment.id),
    [assignment.id], true
  );
  const subs = subsData?.results ?? subsData ?? [];
  const mySubmission = subs[0]; // Latest or only submission

  const submit = async () => {
    if (!file) return notify({ type: 'error', title: 'Erreur', message: 'Sélectionnez un fichier à soumettre' });
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await elearningService.submitAssignment(assignment.id, fd);
      notify({ type: 'success', title: 'Devoir soumis', message: 'Votre devoir a bien été envoyé' });
      setFile(null);
      refetchSubs();
    } catch (e) {
      notify({ type: 'error', title: 'Erreur', message: e.message || 'Erreur lors de la soumission' });
    } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-bold transition-all"
        style={{ color: C }}
        onMouseEnter={e => e.currentTarget.style.opacity = '.7'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
        <ChevronLeft className="h-4 w-4" /> Retour aux devoirs
      </button>

      <div className="rounded-2xl p-5 space-y-4" style={{ border: '1.5px solid #f0f4f9', background: '#fff' }}>
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: C_ICON }}>
            <ClipboardList className="h-5 w-5" style={{ color: C }} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-extrabold" style={{ color: '#0f172a' }}>{assignment.title}</h2>
            <p className="text-xs font-semibold mt-0.5" style={{ color: '#94a3b8' }}>
              {assignment.subject_name} · {assignment.class_name}
            </p>
          </div>
          {assignment.deadline && (
            <div className="text-right flex-shrink-0">
              <p className="text-[10px] font-bold uppercase" style={{ color: '#94a3b8' }}>Date limite</p>
              <p className="text-sm font-bold" style={{ color: new Date(assignment.deadline) < new Date() ? '#ef4444' : '#0f172a' }}>
                {formatDate(assignment.deadline)}
              </p>
            </div>
          )}
        </div>

        {assignment.description && (
          <div className="rounded-xl p-4" style={{ background: '#f8fafc' }}>
            <p className="text-[10px] font-bold uppercase mb-1" style={{ color: '#94a3b8' }}>Description</p>
            <p className="text-sm whitespace-pre-wrap" style={{ color: '#334155' }}>{assignment.description}</p>
          </div>
        )}
        {assignment.instructions && (
          <div className="rounded-xl p-4" style={{ background: '#fdf2f8' }}>
            <p className="text-[10px] font-bold uppercase mb-1" style={{ color: C }}>Instructions</p>
            <p className="text-sm whitespace-pre-wrap" style={{ color: '#334155' }}>{assignment.instructions}</p>
          </div>
        )}

        {assignment.attachment && (
          <div className="flex items-center gap-3 rounded-xl p-3" style={{ border: '1.5px solid #f0f4f9' }}>
            <FileText className="h-5 w-5 flex-shrink-0" style={{ color: '#2563eb' }} />
            <span className="text-sm font-bold flex-1" style={{ color: '#0f172a' }}>Sujet / Fichier de l'enseignant</span>
            <a href={assignment.attachment} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
              style={{ background: '#2563eb' }}>
              <Download className="h-3.5 w-3.5" /> Télécharger
            </a>
          </div>
        )}
      </div>

      {/* Submission section */}
      <div className="rounded-2xl p-5 space-y-4" style={{ border: '1.5px solid #f0f4f9', background: '#fff' }}>
        <p className="text-sm font-extrabold" style={{ color: '#0f172a' }}>Ma soumission</p>

        {loadSubs ? <Spinner /> : mySubmission ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl p-3" style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0' }}>
              <CheckCircle2 className="h-5 w-5 flex-shrink-0" style={{ color: '#059669' }} />
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: '#059669' }}>Devoir soumis</p>
                <p className="text-xs" style={{ color: '#64748b' }}>Envoyé le {formatDate(mySubmission.submitted_at)}</p>
              </div>
              {mySubmission.file && (
                <a href={mySubmission.file} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background: '#059669', color: '#fff' }}>
                  <Download className="h-3.5 w-3.5" /> Mon fichier
                </a>
              )}
            </div>

            {(mySubmission.grade !== null && mySubmission.grade !== undefined) && (
              <div className="rounded-xl p-4 flex items-center gap-4" style={{ background: '#fdf2f8', border: '1.5px solid #fbcfe8' }}>
                <Award className="h-8 w-8 flex-shrink-0" style={{ color: C }} />
                <div>
                  <p className="text-xs font-bold uppercase" style={{ color: '#94a3b8' }}>Note obtenue</p>
                  <p className="text-2xl font-black" style={{ color: C }}>
                    {mySubmission.grade}<span className="text-base font-bold">/20</span>
                  </p>
                  {mySubmission.feedback && <p className="text-xs mt-1" style={{ color: '#64748b' }}>{mySubmission.feedback}</p>}
                </div>
              </div>
            )}

            {mySubmission.quiz_score !== null && mySubmission.quiz_score !== undefined && (
              <div className="flex items-center gap-2 rounded-xl p-3" style={{ background: '#ede9fe' }}>
                <ClipboardCheck className="h-4 w-4 flex-shrink-0" style={{ color: '#7c3aed' }} />
                <p className="text-sm font-bold" style={{ color: '#7c3aed' }}>Score exercices en ligne : {mySubmission.quiz_score}%</p>
              </div>
            )}
            {!mySubmission.grade && !mySubmission.quiz_score && (
              <p className="text-xs text-center py-2" style={{ color: '#94a3b8' }}>En attente de correction par l'enseignant</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm" style={{ color: '#64748b' }}>
              Soumettez votre devoir corrigé au format PDF ou image (JPG, PNG).
            </p>
            <div
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center gap-2 py-8 rounded-xl cursor-pointer transition-all"
              style={{ border: `2px dashed ${file ? C : '#e2e8f0'}`, background: file ? C_BG : '#f8fafc' }}>
              <Upload className="h-7 w-7" style={{ color: file ? C : '#94a3b8' }} />
              <p className="text-sm font-bold" style={{ color: file ? C : '#64748b' }}>
                {file ? file.name : 'Cliquer pour sélectionner un fichier'}
              </p>
              <p className="text-xs" style={{ color: '#94a3b8' }}>PDF, JPG, PNG — max 10 Mo</p>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden"
                onChange={e => setFile(e.target.files[0] || null)} />
            </div>
            <div className="flex justify-end">
              <button onClick={submit} disabled={!file || submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all"
                style={{ background: `linear-gradient(135deg,${C},#be185d)`, boxShadow: `0 4px 14px ${C}40` }}>
                <Send className="h-4 w-4" /> {submitting ? 'Envoi…' : 'Soumettre mon devoir'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inline quiz section if assignment has linked quiz */}
      {assignment.quiz && (
        <AssignmentQuizSection quizId={assignment.quiz} notify={notify} />
      )}
    </div>
  );
}

function AssignmentsTab({ classId }) {
  const [selected, setSelected] = useState(null);
  const { data, loading } = useApi(
    () => classId ? elearningService.getAssignments({ class_obj: classId, status: 'PUBLISHED', page_size: 50 }) : Promise.resolve({ results: [] }),
    [classId], !!classId
  );
  const assignments = data?.results ?? data ?? [];

  if (selected) return <AssignmentDetail assignment={selected} onBack={() => setSelected(null)} />;

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: C_ICON }}>
          <ClipboardList className="h-5 w-5" style={{ color: C }} />
        </div>
        <div>
          <h2 className="text-base font-extrabold" style={{ color: '#0f172a' }}>Mes devoirs</h2>
          <p className="text-xs font-semibold" style={{ color: '#94a3b8' }}>Soumettez vos travaux et consultez vos notes</p>
        </div>
      </div>

      {assignments.length === 0 ? (
        <Empty icon={ClipboardList} text="Aucun devoir disponible" sub="Vos devoirs apparaîtront ici" />
      ) : (
        <div className="grid gap-3">
          {assignments.map(a => (
            <button key={a.id} onClick={() => setSelected(a)}
              className="w-full text-left rounded-2xl p-4 flex items-center gap-4 transition-all"
              style={{ border: '1.5px solid #f0f4f9', background: '#fff' }}
              onMouseEnter={e => { e.currentTarget.style.background = C_BG; e.currentTarget.style.borderColor = '#fbcfe8'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#f0f4f9'; }}>
              <div className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: C_ICON }}>
                <ClipboardList className="h-5 w-5" style={{ color: C }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-extrabold" style={{ color: '#0f172a' }}>{a.title}</p>
                  {a.quiz && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#ede9fe', color: '#7c3aed' }}>Exercices en ligne</span>}
                </div>
                <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{a.subject_name} · {a.class_name}</p>
              </div>
              {a.due_date && (
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] font-bold uppercase" style={{ color: '#94a3b8' }}>Limite</p>
                  <p className="text-xs font-bold" style={{ color: new Date(a.due_date) < new Date() ? '#ef4444' : '#64748b' }}>
                    {formatDate(a.due_date)}
                  </p>
                </div>
              )}
              <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: '#94a3b8' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── COURS AUTONOMES ──────────────────────────────────────────────────────────

function CourseLessonContent({ lesson }) {
  const ct = lesson.content_type || 'TEXT';
  const toEmbed = (url) => {
    if (!url) return '';
    const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]+)/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
    const vm = url.match(/vimeo\.com\/(\d+)/);
    if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
    return url;
  };
  switch (ct) {
    case 'TEXT': return <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#334155' }}>{lesson.content}</p>;
    case 'VIDEO': return <video controls className="w-full rounded-xl" style={{ maxHeight: 400 }} src={lesson.file}>Votre navigateur ne supporte pas la vidéo.</video>;
    case 'PDF': return <iframe src={lesson.file} title={lesson.title} className="w-full rounded-xl" style={{ height: 450, border: '1px solid #f0f4f9' }} />;
    case 'IMAGE': return <img src={lesson.file} alt={lesson.title} className="w-full rounded-xl" />;
    case 'AUDIO': return <audio controls className="w-full" src={lesson.file} />;
    case 'YOUTUBE': case 'VIMEO':
      return <iframe src={toEmbed(lesson.video_url)} allowFullScreen title={lesson.title} className="w-full rounded-xl" style={{ height: 380, border: '1px solid #f0f4f9' }} />;
    default:
      return lesson.file ? (
        <a href={lesson.file} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
          style={{ background: C_BG, color: C }}>
          <Download className="h-4 w-4" /> Télécharger {lesson.title}
        </a>
      ) : null;
  }
}

const CT_ICONS = { TEXT: Type, VIDEO: Film, PDF: FileText, IMAGE: ImageIcon, AUDIO: Music, YOUTUBE: Play, VIMEO: Play, FILE: Paperclip, IFRAME: Link2 };

function CourseViewer({ course, onBack }) {
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [openSections, setOpenSections] = useState({});
  const { data, loading } = useApi(() => elearningService.getCourseById(course.id), [course.id], true);
  const detail = data?.data ?? data;
  const sections = detail?.sections ?? [];

  const toggleSection = (id) => setOpenSections(v => ({ ...v, [id]: !v[id] }));

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <button onClick={selectedLesson ? () => setSelectedLesson(null) : onBack}
        className="inline-flex items-center gap-2 text-sm font-bold" style={{ color: C }}>
        <ChevronLeft className="h-4 w-4" /> {selectedLesson ? 'Retour au cours' : 'Retour aux cours'}
      </button>

      {selectedLesson ? (
        <div className="rounded-2xl p-5 space-y-4" style={{ border: '1.5px solid #f0f4f9', background: '#fff' }}>
          <div className="flex items-center gap-2 flex-wrap">
            {(() => { const Icon = CT_ICONS[selectedLesson.content_type] || FileText; return <Icon className="h-4 w-4 flex-shrink-0" style={{ color: C }} />; })()}
            <h2 className="text-base font-extrabold" style={{ color: '#0f172a' }}>{selectedLesson.title}</h2>
            {selectedLesson.duration_minutes > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: C_BG, color: C }}>
                <Clock className="inline h-3 w-3 mr-1" />{selectedLesson.duration_minutes} min
              </span>
            )}
          </div>
          {selectedLesson.description && <p className="text-sm" style={{ color: '#64748b' }}>{selectedLesson.description}</p>}
          <CourseLessonContent lesson={selectedLesson} />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Course header */}
          <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid #f0f4f9' }}>
            {detail?.thumbnail && (
              <img src={detail.thumbnail} alt={detail.title} className="w-full h-40 object-cover" />
            )}
            <div className="p-5">
              <h1 className="text-lg font-extrabold" style={{ color: '#0f172a' }}>{detail?.title}</h1>
              {detail?.subtitle && <p className="text-sm mt-1" style={{ color: '#64748b' }}>{detail.subtitle}</p>}
              {detail?.description && <p className="text-sm mt-2 whitespace-pre-wrap" style={{ color: '#475569' }}>{detail.description}</p>}
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-2">
            {sections.map(section => (
              <div key={section.id} className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid #f0f4f9' }}>
                <button onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5"
                  style={{ background: 'linear-gradient(135deg,#fafbff,#fff)' }}>
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: C_ICON }}>
                    <Layers className="h-4 w-4" style={{ color: C }} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-extrabold" style={{ color: '#0f172a' }}>{section.title}</p>
                    <p className="text-[11px]" style={{ color: '#94a3b8' }}>{section.chapters?.length ?? 0} chapitres</p>
                  </div>
                  {openSections[section.id] ? <ChevronLeft className="h-4 w-4 rotate-90" style={{ color: '#94a3b8' }} /> : <ChevronRight className="h-4 w-4" style={{ color: '#94a3b8' }} />}
                </button>
                {openSections[section.id] && (
                  <div className="p-3 space-y-2" style={{ borderTop: '1px solid #f0f4f9' }}>
                    {(section.chapters ?? []).map(ch => (
                      <div key={ch.id} className="rounded-xl overflow-hidden" style={{ border: '1.5px solid #f0f4f9' }}>
                        <div className="px-3 py-2.5" style={{ background: '#f8fafc' }}>
                          <p className="text-xs font-bold" style={{ color: '#475569' }}>{ch.title}</p>
                        </div>
                        <div className="p-2 space-y-1">
                          {(ch.lessons ?? []).map(l => {
                            const Icon = CT_ICONS[l.content_type] || FileText;
                            return (
                              <button key={l.id} onClick={() => setSelectedLesson(l)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                                style={{ background: '#fff' }}
                                onMouseEnter={e => e.currentTarget.style.background = C_BG}
                                onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                                <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: C_ICON }}>
                                  <Icon className="h-3.5 w-3.5" style={{ color: C }} />
                                </div>
                                <span className="text-sm font-semibold flex-1 truncate" style={{ color: '#0f172a' }}>{l.title}</span>
                                {l.duration_minutes > 0 && <span className="text-xs flex-shrink-0" style={{ color: '#94a3b8' }}>{l.duration_minutes} min</span>}
                                {l.is_preview_free && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: '#d1fae5', color: '#059669' }}>Gratuit</span>}
                                <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#94a3b8' }} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CoursesTab() {
  const [selected, setSelected] = useState(null);
  const { data, loading } = useApi(() => elearningService.getCourses({ is_published: true, page_size: 50 }), [], true);
  const courses = data?.results ?? data ?? [];

  const LEVEL_COLORS = { BEGINNER: { bg: '#d1fae5', color: '#059669', label: 'Débutant' }, INTERMEDIATE: { bg: '#dbeafe', color: '#2563eb', label: 'Intermédiaire' }, ADVANCED: { bg: '#fce7f3', color: C, label: 'Avancé' }, EXPERT: { bg: '#f3e8ff', color: '#7c3aed', label: 'Expert' } };

  if (selected) return <CourseViewer course={selected} onBack={() => setSelected(null)} />;

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: C_ICON }}>
          <Layers className="h-5 w-5" style={{ color: C }} />
        </div>
        <div>
          <h2 className="text-base font-extrabold" style={{ color: '#0f172a' }}>Cours en ligne</h2>
          <p className="text-xs font-semibold" style={{ color: '#94a3b8' }}>Cours autonomes à votre rythme</p>
        </div>
      </div>
      {courses.length === 0 ? (
        <Empty icon={Layers} text="Aucun cours disponible" sub="Les cours seront publiés prochainement" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {courses.map(c => {
            const lv = LEVEL_COLORS[c.level] || LEVEL_COLORS.BEGINNER;
            return (
              <button key={c.id} onClick={() => setSelected(c)}
                className="text-left rounded-2xl overflow-hidden transition-all"
                style={{ border: '1.5px solid #f0f4f9', background: '#fff' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 32px rgba(219,39,119,0.12)'; e.currentTarget.style.borderColor = '#fbcfe8'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#f0f4f9'; }}>
                {c.thumbnail ? (
                  <img src={c.thumbnail} alt={c.title} className="w-full h-36 object-cover" />
                ) : (
                  <div className="w-full h-36 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#fdf2f8,#fce7f3)' }}>
                    <Layers className="h-10 w-10 opacity-30" style={{ color: C }} />
                  </div>
                )}
                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: lv.bg, color: lv.color }}>{lv.label}</span>
                    {c.is_free && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#d1fae5', color: '#059669' }}>Gratuit</span>}
                  </div>
                  <p className="text-sm font-extrabold leading-snug" style={{ color: '#0f172a' }}>{c.title}</p>
                  {c.subtitle && <p className="text-xs" style={{ color: '#64748b' }}>{c.subtitle}</p>}
                  <div className="flex items-center justify-between text-xs" style={{ color: '#94a3b8' }}>
                    {c.student_count > 0 && <span><Users className="inline h-3 w-3 mr-1" />{c.student_count}</span>}
                    <span className="inline-flex items-center gap-1 font-bold" style={{ color: C }}>
                      Commencer <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── QUIZ LIST ────────────────────────────────────────────────────────────────

function QuizListTab({ classId, navigate }) {
  const { data, loading } = useApi(
    () => classId ? elearningService.getQuizzes({ class_obj: classId, is_published: true, page_size: 50 }) : Promise.resolve({ results: [] }),
    [classId], !!classId
  );
  const quizzes = data?.results ?? data ?? [];

  if (loading) return <Spinner />;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#ede9fe' }}>
          <ClipboardCheck className="h-5 w-5" style={{ color: '#7c3aed' }} />
        </div>
        <div>
          <h2 className="text-base font-extrabold" style={{ color: '#0f172a' }}>Quiz disponibles</h2>
          <p className="text-xs font-semibold" style={{ color: '#94a3b8' }}>Testez vos connaissances</p>
        </div>
      </div>
      {quizzes.length === 0 ? (
        <Empty icon={ClipboardCheck} text="Aucun quiz disponible" sub="Les quiz apparaîtront ici" />
      ) : (
        <div className="grid gap-3">
          {quizzes.map(q => {
            const best = q.best_score;
            const attempted = (q.attempts_used || 0) > 0;
            return (
              <div key={q.id} className="rounded-2xl p-4 flex items-center gap-4"
                style={{ border: attempted ? (best?.is_passed ? '1.5px solid #d1fae5' : '1.5px solid #fde68a') : '1.5px solid #f0f4f9', background: '#fff' }}>
                <div className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: attempted ? (best?.is_passed ? '#d1fae5' : '#fef3c7') : '#ede9fe' }}>
                  {attempted && best?.is_passed
                    ? <CheckCircle2 className="h-5 w-5" style={{ color: '#059669' }} />
                    : <ClipboardCheck className="h-5 w-5" style={{ color: attempted ? '#d97706' : '#7c3aed' }} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-extrabold" style={{ color: '#0f172a' }}>{q.title}</p>
                  <div className="flex items-center gap-3 text-xs mt-0.5" style={{ color: '#64748b' }}>
                    {q.question_count > 0 && <span>{q.question_count} question{q.question_count > 1 ? 's' : ''}</span>}
                    {q.time_limit_minutes > 0 && <span><Clock className="inline h-3 w-3 mr-0.5" />{q.time_limit_minutes} min</span>}
                    {q.pass_score_percent > 0 && <span><Award className="inline h-3 w-3 mr-0.5" />Seuil {q.pass_score_percent}%</span>}
                  </div>
                  {attempted && best && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: best.is_passed ? '#d1fae5' : '#fef3c7',
                          color: best.is_passed ? '#059669' : '#d97706',
                        }}>
                        {best.is_passed ? '✓ Réussi' : '✗ Échoué'} — {best.percent.toFixed(0)}%
                      </span>
                      <span className="text-[10px]" style={{ color: '#94a3b8' }}>
                        {q.attempts_used} tentative{q.attempts_used > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>
                <button onClick={() => navigate(`/student/quiz/${q.id}`)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold flex-shrink-0"
                  style={attempted
                    ? { background: '#f1f5f9', color: '#475569' }
                    : { background: 'linear-gradient(135deg,#7c3aed,#6366f1)', color: '#fff', boxShadow: '0 4px 14px #7c3aed30' }
                  }>
                  <Play className="h-3.5 w-3.5" />
                  {attempted ? (q.max_attempts > 0 && q.attempts_used >= q.max_attempts ? 'Terminé' : 'Rejouer') : 'Commencer'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── EXAMENS LIST ─────────────────────────────────────────────────────────────

function ExamsListTab({ classId, navigate }) {
  const { data, loading } = useApi(
    () => classId ? elearningService.getSecureExams({ class_obj: classId, is_published: true, page_size: 50 }) : Promise.resolve({ results: [] }),
    [classId], !!classId
  );
  const exams = data?.results ?? data ?? [];
  const EXAM_TYPES = { MID: 'Partiel', FINAL: 'Examen final', SUPP: 'Rattrapage', TP: 'TP noté', CONCOURS: 'Concours' };

  if (loading) return <Spinner />;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#fee2e2' }}>
          <Shield className="h-5 w-5" style={{ color: '#dc2626' }} />
        </div>
        <div>
          <h2 className="text-base font-extrabold" style={{ color: '#0f172a' }}>Examens</h2>
          <p className="text-xs font-semibold" style={{ color: '#94a3b8' }}>Examens officiels sécurisés</p>
        </div>
      </div>
      {exams.length === 0 ? (
        <Empty icon={Shield} text="Aucun examen disponible" sub="Les examens apparaîtront ici" />
      ) : (
        <div className="grid gap-3">
          {exams.map(ex => {
            const now = new Date();
            const start = ex.start_date ? new Date(ex.start_date) : null;
            const end = ex.end_date ? new Date(ex.end_date) : null;
            const available = ex.is_published && (!start || now >= start) && (!end || now <= end);
            return (
              <div key={ex.id} className="rounded-2xl p-4 flex items-center gap-4" style={{ border: '1.5px solid #f0f4f9', background: '#fff' }}>
                <div className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#fee2e2' }}>
                  <Shield className="h-5 w-5" style={{ color: '#dc2626' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-extrabold" style={{ color: '#0f172a' }}>{ex.title}</p>
                  <div className="flex items-center gap-3 text-xs mt-0.5" style={{ color: '#64748b' }}>
                    <span>{EXAM_TYPES[ex.exam_type] || ex.exam_type}</span>
                    <span><Clock className="inline h-3 w-3 mr-0.5" />{ex.duration_minutes} min</span>
                    {start && <span><Calendar className="inline h-3 w-3 mr-0.5" />{formatDate(ex.start_date)}</span>}
                  </div>
                </div>
                {available ? (
                  <button onClick={() => navigate(`/student/exams/${ex.id}`)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#dc2626,#ef4444)', boxShadow: '0 4px 14px #dc262630' }}>
                    <Shield className="h-3.5 w-3.5" /> Accéder
                  </button>
                ) : (
                  <span className="text-xs font-bold px-3 py-1.5 rounded-xl flex-shrink-0" style={{ background: '#f1f5f9', color: '#94a3b8' }}>
                    {!start || now < start ? 'Pas encore ouvert' : 'Terminé'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── REDIRECT CARD ────────────────────────────────────────────────────────────

function RedirectCard({ icon: Icon, title, desc, color, bg, to, navigate }) {
  return (
    <div className="flex flex-col items-center gap-5 py-16">
      <div className="h-20 w-20 rounded-3xl flex items-center justify-center" style={{ background: bg }}>
        <Icon className="h-9 w-9" style={{ color }} />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-extrabold" style={{ color: '#0f172a' }}>{title}</h2>
        <p className="text-sm mt-1" style={{ color: '#64748b' }}>{desc}</p>
      </div>
      <button onClick={() => navigate(to)}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white"
        style={{ background: `linear-gradient(135deg,${color},${color}bb)`, boxShadow: `0 4px 14px ${color}40` }}>
        <ArrowRight className="h-4 w-4" /> Accéder
      </button>
    </div>
  );
}

// ─── ACCUEIL DASHBOARD ────────────────────────────────────────────────────────

function AccueilTab({ classId, setActiveTab }) {
  const { data: classrooms } = useApi(
    () => classId ? elearningService.getClassrooms({ class_obj: classId, page_size: 10 }) : Promise.resolve({ results: [] }),
    [classId], !!classId
  );
  const { data: assignments } = useApi(
    () => classId ? elearningService.getAssignments({ class_obj: classId, status: 'PUBLISHED', page_size: 10 }) : Promise.resolve({ results: [] }),
    [classId], !!classId
  );
  const { data: quizzes } = useApi(
    () => classId ? elearningService.getQuizzes({ class_obj: classId, is_published: true, page_size: 10 }) : Promise.resolve({ results: [] }),
    [classId], !!classId
  );

  const liveCount = (classrooms?.results ?? classrooms ?? []).filter(c => classroomStatus(c) === 'live').length;
  const assignCount = (assignments?.results ?? assignments ?? []).length;
  const quizCount = (quizzes?.results ?? quizzes ?? []).length;

  const CARDS = [
    { id: 'cours', label: 'Cours en ligne', icon: Layers, color: C, bg: C_BG, value: null, sub: 'Cours autonomes' },
    { id: 'lecons', label: 'Mes leçons', icon: BookOpen, color: '#059669', bg: '#f0fdf4', value: null, sub: 'Parcours pédagogique' },
    { id: 'classes-virt', label: 'Classes virtuelles', icon: MonitorPlay, color: liveCount > 0 ? '#059669' : '#2563eb', bg: liveCount > 0 ? '#f0fdf4' : '#eff6ff', value: liveCount > 0 ? liveCount : null, sub: liveCount > 0 ? 'session(s) en direct' : 'Sessions live' },
    { id: 'devoirs', label: 'Mes devoirs', icon: ClipboardList, color: '#d97706', bg: '#fffbeb', value: assignCount || null, sub: assignCount ? 'devoir(s) à rendre' : 'Travaux à soumettre' },
    { id: 'quiz', label: 'Quiz', icon: ClipboardCheck, color: '#7c3aed', bg: '#ede9fe', value: quizCount || null, sub: quizCount ? 'quiz disponible(s)' : 'Tests de connaissances' },
    { id: 'examens', label: 'Examens', icon: Shield, color: '#dc2626', bg: '#fee2e2', value: null, sub: 'Examens officiels' },
    { id: 'labos', label: 'Laboratoires', icon: FlaskConical, color: '#16a34a', bg: '#ecfdf5', value: null, sub: 'Labs virtuels' },
    { id: 'notes', label: 'Notes & Bulletins', icon: Award, color: '#9333ea', bg: '#faf5ff', value: null, sub: 'Résultats académiques' },
    { id: 'bibliotheque', label: 'Bibliothèque', icon: Library, color: '#7c3aed', bg: '#f5f3ff', value: null, sub: 'Ressources pédagogiques' },
    { id: 'ia', label: 'Tuteur IA', icon: Bot, color: '#0d9488', bg: '#f0fdfa', value: null, sub: 'Aide intelligente' },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl p-5" style={{ background: `linear-gradient(135deg, ${C}, #be185d)` }}>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl flex items-center justify-center bg-white/20">
            <BookMarked className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-white">Mon espace E-Learning</h1>
            <p className="text-xs font-semibold text-white/70">Accédez à tous vos contenus pédagogiques</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {CARDS.map(card => (
          <button key={card.id} onClick={() => setActiveTab(card.id)}
            className="text-left rounded-2xl p-4 transition-all"
            style={{ border: '1.5px solid #f0f4f9', background: '#fff' }}
            onMouseEnter={e => { e.currentTarget.style.background = card.bg; e.currentTarget.style.borderColor = card.color + '40'; e.currentTarget.style.boxShadow = `0 4px 20px ${card.color}15`; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#f0f4f9'; e.currentTarget.style.boxShadow = 'none'; }}>
            <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-3" style={{ background: card.bg }}>
              <card.icon className="h-5 w-5" style={{ color: card.color }} />
            </div>
            {card.value !== null && (
              <p className="text-xl font-black mb-0.5" style={{ color: card.color }}>{card.value}</p>
            )}
            <p className="text-sm font-extrabold" style={{ color: '#0f172a' }}>{card.label}</p>
            <p className="text-[11px] mt-0.5" style={{ color: '#94a3b8' }}>{card.sub}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── NOTES & BULLETINS ───────────────────────────────────────────────────────

const STATUS_COLORS_CARD = {
  DRAFT: { label: 'Brouillon', color: '#64748b', bg: '#f8fafc' },
  GENERATED: { label: 'Généré', color: '#0891b2', bg: '#ecfeff' },
  PUBLISHED: { label: 'Publié', color: '#059669', bg: '#f0fdf4' },
};

function BulletinDownloadBtn({ cardId, cardName }) {
  const { notify } = useNotifications();
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const blob = await gradesService.getBulletinPdf(cardId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bulletin_${cardName.replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      notify('Erreur lors du téléchargement du bulletin', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-60"
      style={{ background: '#f0fdf4', color: '#059669', border: '1.5px solid #bbf7d0' }}
    >
      {loading ? (
        <div className="h-4 w-4 rounded-full border-2 animate-spin" style={{ borderColor: '#bbf7d0', borderTopColor: '#059669' }} />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {loading ? 'Génération…' : 'Télécharger mon bulletin'}
    </button>
  );
}

function NotesTab({ studentId }) {
  const [sub, setSub] = useState('bulletins');

  const { data: gradesData, loading: loadGrades } = useApi(
    () => studentId ? gradesService.getGrades({ student: studentId, page_size: 100 }) : Promise.resolve([]),
    [studentId], !!studentId
  );
  const { data: cardsData, loading: loadCards } = useApi(
    () => studentId ? gradesService.getReportCards({ student: studentId, page_size: 50 }) : Promise.resolve([]),
    [studentId], !!studentId
  );

  const grades = Array.isArray(gradesData) ? gradesData : (gradesData?.results ?? []);
  const cards = Array.isArray(cardsData) ? cardsData : (cardsData?.results ?? []);
  const publishedCards = cards.filter(c => c.is_published);

  const avg = grades.length > 0
    ? (grades.reduce((s, g) => s + parseFloat(g.score || 0), 0) / grades.length).toFixed(2)
    : null;

  const TABS = [
    { id: 'bulletins', label: 'Bulletins', count: publishedCards.length },
    { id: 'notes', label: 'Notes détaillées', count: grades.length },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#faf5ff' }}>
            <Award className="h-5 w-5" style={{ color: '#9333ea' }} />
          </div>
          <div>
            <h2 className="text-base font-extrabold" style={{ color: '#0f172a' }}>Notes & Bulletins</h2>
            <p className="text-xs font-semibold" style={{ color: '#94a3b8' }}>Résultats académiques et bulletins de notes</p>
          </div>
        </div>
        {avg && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
               style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0' }}>
            <BarChart2 className="h-4 w-4" style={{ color: '#059669' }} />
            <span className="text-sm font-extrabold" style={{ color: '#059669' }}>
              Moyenne générale : {avg}/20
            </span>
          </div>
        )}
      </div>

      {/* Sous-onglets */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#f8fafc', width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setSub(t.id)}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
            style={sub === t.id
              ? { background: '#fff', color: '#1e293b', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
              : { color: '#64748b' }}>
            {t.label}
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: sub === t.id ? '#e0e7ff' : '#f1f5f9', color: sub === t.id ? '#4f46e5' : '#94a3b8' }}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Bulletins */}
      {sub === 'bulletins' && (
        loadCards ? <Spinner /> :
        publishedCards.length === 0 ? (
          <Empty icon={Award} text="Aucun bulletin disponible" sub="Vos bulletins apparaîtront ici une fois publiés." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {publishedCards.map(card => {
              const cardAvg = card.average ? parseFloat(card.average) : null;
              const statusInfo = STATUS_COLORS_CARD[card.status] || STATUS_COLORS_CARD.DRAFT;
              const passing = cardAvg !== null && cardAvg >= 10;
              return (
                <div key={card.id} className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid #f0f4f9', background: '#fff' }}>
                  <div className="h-1.5" style={{ background: passing ? 'linear-gradient(90deg,#059669,#34d399)' : 'linear-gradient(90deg,#dc2626,#f87171)' }} />
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-extrabold" style={{ color: '#0f172a' }}>
                          {card.semester_name || `Semestre ${card.semester}`}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{card.academic_year_name || ''}</p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{ background: statusInfo.bg, color: statusInfo.color }}>
                        {statusInfo.label}
                      </span>
                    </div>
                    {cardAvg !== null && (
                      <div className="flex items-center gap-3 mt-3">
                        <div className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0"
                             style={{ background: passing ? '#f0fdf4' : '#fef2f2' }}>
                          <Award className="h-5 w-5" style={{ color: passing ? '#059669' : '#dc2626' }} />
                        </div>
                        <div>
                          <p className="text-2xl font-extrabold" style={{ color: passing ? '#059669' : '#dc2626' }}>
                            {cardAvg.toFixed(2)}/20
                          </p>
                          <p className="text-[10px] font-semibold" style={{ color: '#94a3b8' }}>Moyenne générale</p>
                        </div>
                      </div>
                    )}
                    {card.class_name && (
                      <p className="text-xs mt-3 font-semibold" style={{ color: '#64748b' }}>Classe : {card.class_name}</p>
                    )}
                    <BulletinDownloadBtn cardId={card.id} cardName={card.semester_name || 'Semestre'} />
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Notes détaillées */}
      {sub === 'notes' && (
        loadGrades ? <Spinner /> :
        grades.length === 0 ? (
          <Empty icon={BookOpen} text="Aucune note disponible" sub="Vos notes apparaîtront ici après correction" />
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid #f0f4f9' }}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                    {['Matière', 'Catégorie', 'Note', 'Sur', 'Date'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider"
                          style={{ color: '#94a3b8' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grades.map((g, i) => {
                    const score = parseFloat(g.score || 0);
                    const maxScore = parseFloat(g.max_score || 20);
                    const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
                    const color = pct >= 50 ? '#059669' : '#dc2626';
                    return (
                      <tr key={g.id} style={{ borderBottom: '1px solid #f8fafc', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td className="px-4 py-3 text-sm font-semibold" style={{ color: '#1e293b' }}>
                          {g.subject_name || g.subject || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{ background: '#e0e7ff', color: '#4f46e5' }}>
                            {g.category_name || g.category || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-extrabold" style={{ color }}>{g.score}</span>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold" style={{ color: '#94a3b8' }}>{g.max_score || 20}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: '#94a3b8' }}>
                          {g.date ? new Date(g.date).toLocaleDateString('fr-FR') : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────────────────────

export default function StudentELearning() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('accueil');
  const [collapsed, setCollapsed] = useState(false);
  const { data: profile } = useApi(() => studentsService.getMe(), [], true);
  const classId = profile?.current_class?.id;
  const studentId = profile?.id;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-11 w-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: C_ICON }}>
          <BookMarked className="h-5 w-5" style={{ color: C }} />
        </div>
        <div>
          <h1 className="text-lg font-extrabold" style={{ color: '#0f172a' }}>E-Learning</h1>
          <p className="text-xs font-semibold" style={{ color: '#94a3b8' }}>Cours, classes virtuelles, devoirs et évaluations</p>
        </div>
      </div>

      {/* Sidebar + Content */}
      <div className="flex rounded-2xl overflow-hidden" style={{ minHeight: 620, border: '1.5px solid #f0f4f9' }}>

        {/* SIDEBAR */}
        <div style={{ width: collapsed ? 56 : 220, flexShrink: 0, transition: 'width 250ms ease', borderRight: '1.5px solid #f0f4f9', background: 'linear-gradient(180deg,#fafbff,#f8fafc)', display: 'flex', flexDirection: 'column' }}>
          <div className="flex items-center px-3 py-3" style={{ borderBottom: '1.5px solid #f0f4f9', minHeight: 48 }}>
            {!collapsed && <span className="text-[10px] font-extrabold uppercase tracking-widest flex-1" style={{ color: '#cbd5e1' }}>Menu</span>}
            <button onClick={() => setCollapsed(v => !v)}
              className="h-7 w-7 rounded-lg flex items-center justify-center transition-all flex-shrink-0"
              style={{ color: '#94a3b8', marginLeft: 'auto' }}
              onMouseEnter={e => { e.currentTarget.style.background = C_ICON; e.currentTarget.style.color = C; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}>
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex-1 py-2 overflow-y-auto">
            {SIDEBAR_GROUPS.map((group, gi) => (
              <div key={gi} className={gi > 0 ? 'mt-1' : ''}>
                {!collapsed && (
                  <p className="px-4 pt-2 pb-0.5 text-[9px] font-extrabold uppercase tracking-widest" style={{ color: '#cbd5e1' }}>{group.label}</p>
                )}
                {collapsed && gi > 0 && <div className="mx-3 my-1" style={{ borderTop: '1px solid #f0f4f9' }} />}
                {group.items.map(item => {
                  const active = activeTab === item.id;
                  return (
                    <button key={item.id} onClick={() => setActiveTab(item.id)} title={collapsed ? item.label : undefined}
                      className="w-full flex items-center gap-2.5 transition-all"
                      style={{
                        padding: collapsed ? '8px 0' : '8px 12px',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        background: active ? `linear-gradient(90deg, ${C_BG}, ${C}0a)` : 'transparent',
                        color: active ? C : '#64748b',
                        borderLeft: active ? `3px solid ${C}` : '3px solid transparent',
                      }}>
                      <item.icon className="h-[14px] w-[14px] flex-shrink-0" style={{ color: active ? C : '#94a3b8' }} />
                      {!collapsed && <span style={{ fontSize: '12.5px', fontWeight: 600 }}>{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 p-6 overflow-auto min-w-0">
          {activeTab === 'accueil'      && <AccueilTab classId={classId} setActiveTab={setActiveTab} />}
          {activeTab === 'cours'        && <CoursesTab />}
          {activeTab === 'lecons'       && <RedirectCard icon={BookOpen} title="Mes leçons" desc="Suivez votre parcours pédagogique par matière" color="#059669" bg="#f0fdf4" to="/student/courses" navigate={navigate} />}
          {activeTab === 'videoteque'   && <RedirectCard icon={Film} title="Vidéothèque" desc="Accédez aux vidéos de cours et conférences" color="#7c3aed" bg="#f5f3ff" to="/student/videos" navigate={navigate} />}
          {activeTab === 'classes-virt' && <VirtualClassroomsTab classId={classId} />}
          {activeTab === 'devoirs'      && <AssignmentsTab classId={classId} />}
          {activeTab === 'quiz'         && <QuizListTab classId={classId} navigate={navigate} />}
          {activeTab === 'examens'      && <ExamsListTab classId={classId} navigate={navigate} />}
          {activeTab === 'labos'        && <RedirectCard icon={FlaskConical} title="Laboratoires virtuels" desc="Réalisez vos expériences en ligne" color="#16a34a" bg="#ecfdf5" to="/student/labs" navigate={navigate} />}
          {activeTab === 'bibliotheque' && <RedirectCard icon={Library} title="Bibliothèque" desc="Livres, articles et ressources pédagogiques" color="#9333ea" bg="#faf5ff" to="/student/library" navigate={navigate} />}
          {activeTab === 'ia'           && <RedirectCard icon={Bot} title="Tuteur IA" desc="Posez vos questions à votre assistant intelligent" color="#0d9488" bg="#f0fdfa" to="/student/ai-tutor" navigate={navigate} />}
          {activeTab === 'notes'        && <NotesTab studentId={studentId} />}
        </div>
      </div>
    </div>
  );
}
