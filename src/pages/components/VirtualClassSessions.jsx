/**
 * VirtualClassSessions — Gestion des segments de classe virtuelle
 * Utilisé à la fois côté étudiant (lecture/rejoindre) et admin (gérer/démarrer/terminer)
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Video, Play, CheckCircle, Clock, AlertCircle, ChevronRight,
  Users, Calendar, RefreshCw, Settings, Zap, BarChart2,
  ExternalLink, ArrowRight, Bell, Shield, LogOut,
} from 'lucide-react';
import { elearningService } from '../../services/elearning';

const P = '#db2777';
const P_LIGHT = '#fce7f3';

const STATUS_META = {
  PLANIFIEE:  { label: 'Planifiée',   color: '#6366f1', bg: '#eef2ff',  icon: Clock },
  EN_ATTENTE: { label: 'En attente',  color: '#d97706', bg: '#fffbeb',  icon: Bell },
  EN_COURS:   { label: 'En cours',    color: '#059669', bg: '#f0fdf4',  icon: Play },
  TERMINEE:   { label: 'Terminée',    color: '#94a3b8', bg: '#f8fafc',  icon: CheckCircle },
  ANNULEE:    { label: 'Annulée',     color: '#ef4444', bg: '#fef2f2',  icon: AlertCircle },
};

function fmtTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
function fmtDT(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// Chrono compte-à-rebours
function Countdown({ targetTime, onExpire }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const update = () => {
      const diff = Math.max(0, new Date(targetTime).getTime() - Date.now());
      setRemaining(diff);
      if (diff === 0 && onExpire) onExpire();
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [targetTime, onExpire]);

  const s = Math.floor(remaining / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  if (remaining === 0) return <span style={{ color: '#059669' }}>Terminé</span>;

  return (
    <span className="font-mono font-black text-lg" style={{ color: P }}>
      {h > 0 && `${String(h).padStart(2, '0')}:`}
      {String(m).padStart(2, '0')}:{String(sec).padStart(2, '0')}
    </span>
  );
}

// Modale de transition entre sessions
function TransitionModal({ nextSegment, onJoin, onDismiss }) {
  if (!nextSegment) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div className="w-full max-w-sm rounded-3xl overflow-hidden"
           style={{ background: 'white', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
        {/* Header animé */}
        <div className="px-8 py-8 text-center"
             style={{ background: `linear-gradient(135deg, ${P}, #be185d)` }}>
          <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
            <ArrowRight className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-xl font-black text-white">Session suivante</h2>
          <p className="text-sm text-white/80 mt-1">La session {nextSegment.sequence} est prête</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="rounded-2xl p-4 text-center" style={{ background: '#f0fdf4' }}>
            <p className="text-xs font-bold mb-1" style={{ color: '#059669' }}>HEURE DE DÉBUT</p>
            <p className="text-2xl font-black" style={{ color: '#059669' }}>{fmtTime(nextSegment.start_time)}</p>
          </div>

          <p className="text-sm text-center" style={{ color: '#64748b' }}>
            Cliquez sur <strong>Continuer</strong> pour rejoindre la prochaine session
            et rester dans le cours.
          </p>

          <button onClick={onJoin}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-black text-white"
                  style={{ background: `linear-gradient(135deg,${P},#be185d)` }}>
            <ExternalLink className="h-4 w-4" /> Continuer le cours
          </button>
          <button onClick={onDismiss}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold"
                  style={{ color: '#94a3b8' }}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function VirtualClassSessions({ classroom, isAdmin = false, onRefresh }) {
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [transitionModal, setTransitionModal] = useState(null);
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const [activeTab, setActiveTab] = useState('sessions');
  const [segmentDuration, setSegmentDuration] = useState(55);

  const fetchSegments = useCallback(() => {
    if (!classroom?.id) return;
    elearningService.getClassroomSegments(classroom.id)
      .then(res => setSegments(Array.isArray(res) ? res : res?.results || []))
      .catch(() => setSegments([]))
      .finally(() => setLoading(false));
  }, [classroom?.id]);

  useEffect(() => {
    fetchSegments();
    // Polling toutes les 30s pour mettre à jour les statuts en temps réel
    const interval = setInterval(fetchSegments, 30000);
    return () => clearInterval(interval);
  }, [fetchSegments]);

  const fetchLogs = () => {
    elearningService.getClassroomLogs(classroom.id)
      .then(res => setLogs(Array.isArray(res) ? res : res?.results || []))
      .catch(() => {});
  };

  const handleGenerateSegments = async (force = false) => {
    setGenerating(true);
    try {
      const res = await elearningService.generateSegments(classroom.id, {
        segment_duration: segmentDuration,
        force,
      });
      setSegments(Array.isArray(res) ? res : []);
    } catch (e) {
      alert(e.message || 'Erreur lors de la génération des segments');
    } finally {
      setGenerating(false);
    }
  };

  const handleScheduleTasks = async () => {
    setScheduling(true);
    try {
      await elearningService.scheduleClassroomTasks(classroom.id);
      alert('Notifications et transitions planifiées avec succès !');
    } catch (e) {
      alert(e.message || 'Erreur lors de la planification');
    } finally {
      setScheduling(false);
    }
  };

  const handleStartSegment = async (segId) => {
    setActionLoading(segId + '-start');
    try {
      const updated = await elearningService.startSegment(segId);
      setSegments(prev => prev.map(s => s.id === segId ? updated : s));
    } catch (e) {
      alert(e.message || 'Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEndSegment = async (seg) => {
    setActionLoading(seg.id + '-end');
    try {
      const res = await elearningService.endSegment(seg.id);
      fetchSegments();
      if (res.next) {
        setTransitionModal(res.next);
      }
      if (onRefresh) onRefresh();
    } catch (e) {
      alert(e.message || 'Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handleJoinSegment = async (seg) => {
    setActionLoading(seg.id + '-join');
    try {
      const res = await elearningService.joinSegment(seg.id);
      if (res.meeting_url) {
        window.open(res.meeting_url, '_blank', 'noopener,noreferrer');
      }
    } catch (e) {
      // Ouvrir quand même l'URL si disponible
      if (seg.meeting_url) window.open(seg.meeting_url, '_blank', 'noopener,noreferrer');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLeaveSegment = async (segId) => {
    try {
      await elearningService.leaveSegment(segId);
    } catch (e) {
      // silencieux
    }
  };

  const totalDuration = classroom?.duration_minutes || 0;
  const done    = segments.filter(s => s.status === 'TERMINEE').length;
  const inProgress = segments.find(s => s.status === 'EN_COURS');
  const next    = segments.find(s => s.status === 'EN_ATTENTE');
  const progress = segments.length > 0 ? Math.round((done / segments.length) * 100) : 0;

  return (
    <div>
      {/* Modale transition */}
      {transitionModal && (
        <TransitionModal
          nextSegment={transitionModal}
          onJoin={() => {
            if (transitionModal.meeting_url) {
              window.open(transitionModal.meeting_url, '_blank', 'noopener,noreferrer');
            }
            setTransitionModal(null);
          }}
          onDismiss={() => setTransitionModal(null)}
        />
      )}

      {/* En-tête du cours */}
      <div className="rounded-2xl p-5 mb-5" style={{ background: 'white', boxShadow: '0 1px 8px #0001' }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-black" style={{ color: '#1e293b' }}>{classroom.title}</h2>
            <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
              {fmtDT(classroom.start_time)} · {totalDuration} min au total
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchSegments}
                    className="h-8 w-8 rounded-lg flex items-center justify-center"
                    style={{ background: '#f8fafc' }}>
              <RefreshCw className="h-3.5 w-3.5" style={{ color: '#64748b' }} />
            </button>
          </div>
        </div>

        {segments.length > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1.5" style={{ color: '#64748b' }}>
              <span>Progression du cours</span>
              <span className="font-bold">{done}/{segments.length} sessions · {progress}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: '#e2e8f0' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: `linear-gradient(90deg,${P},#be185d)` }} />
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[['sessions','Sessions',Video],['logs','Journal',BarChart2]].map(([k,l,Icon]) => (
          isAdmin || k === 'sessions' ? (
            <button key={k} onClick={() => { setActiveTab(k); if (k === 'logs') fetchLogs(); }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                    style={activeTab === k ? { background: P, color: 'white' } : { background: 'white', color: '#64748b', boxShadow: '0 1px 4px #0001' }}>
              <Icon className="h-3.5 w-3.5" /> {l}
            </button>
          ) : null
        ))}
      </div>

      {/* Onglet Sessions */}
      {activeTab === 'sessions' && (
        <>
          {/* Admin: générer segments */}
          {isAdmin && segments.length === 0 && (
            <div className="rounded-2xl p-6 mb-5 text-center" style={{ background: 'white', boxShadow: '0 1px 8px #0001', border: '2px dashed #e2e8f0' }}>
              <Zap className="h-10 w-10 mx-auto mb-3" style={{ color: P, opacity: 0.7 }} />
              <h3 className="text-base font-black mb-1" style={{ color: '#1e293b' }}>Aucun segment</h3>
              <p className="text-sm mb-4" style={{ color: '#64748b' }}>
                Ce cours de <strong>{totalDuration} min</strong> sera découpé en segments de
              </p>
              <div className="flex items-center justify-center gap-3 mb-5">
                <label className="text-sm font-bold" style={{ color: '#374151' }}>Durée par segment :</label>
                <div className="flex items-center gap-1 border rounded-xl px-3 py-1.5" style={{ borderColor: '#e2e8f0' }}>
                  {[45, 55, 60].map(v => (
                    <button key={v} onClick={() => setSegmentDuration(v)}
                            className="px-3 py-1 rounded-lg text-sm font-bold"
                            style={segmentDuration === v ? { background: P, color: 'white' } : { color: '#64748b' }}>
                      {v} min
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs mb-5" style={{ color: '#94a3b8' }}>
                → {Math.ceil(totalDuration / segmentDuration)} segment(s) seront créés
              </p>
              <button onClick={() => handleGenerateSegments(false)} disabled={generating}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black text-white mx-auto disabled:opacity-50"
                      style={{ background: `linear-gradient(135deg,${P},#be185d)` }}>
                {generating
                  ? <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  : <Zap className="h-4 w-4" />}
                Générer les segments
              </button>
            </div>
          )}

          {/* Admin: regénérer + planifier */}
          {isAdmin && segments.length > 0 && (
            <div className="flex gap-2 mb-4 flex-wrap">
              <button onClick={() => handleGenerateSegments(true)} disabled={generating}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
                      style={{ background: '#fef2f2', color: '#dc2626' }}>
                <RefreshCw className="h-3 w-3" /> Regénérer
              </button>
              <button onClick={handleScheduleTasks} disabled={scheduling}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
                      style={{ background: '#f0fdf4', color: '#059669' }}>
                {scheduling
                  ? <div className="h-3 w-3 rounded-full border border-green-300 border-t-green-600 animate-spin" />
                  : <Bell className="h-3 w-3" />}
                Planifier les notifications
              </button>
            </div>
          )}

          {/* Timeline des segments */}
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="h-7 w-7 rounded-full border-2 animate-spin" style={{ borderColor: P_LIGHT, borderTopColor: P }} />
            </div>
          ) : segments.length === 0 && !isAdmin ? (
            <div className="text-center py-12" style={{ color: '#94a3b8' }}>
              <Video className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucune session planifiée</p>
            </div>
          ) : (
            <div className="space-y-3">
              {segments.map((seg, i) => {
                const meta = STATUS_META[seg.status] || STATUS_META.PLANIFIEE;
                const StatusIcon = meta.icon;
                const isLive = seg.status === 'EN_COURS';
                const isNext = seg.status === 'EN_ATTENTE';
                const isDone = seg.status === 'TERMINEE';
                const startA = actionLoading === seg.id + '-start';
                const endA   = actionLoading === seg.id + '-end';
                const joinA  = actionLoading === seg.id + '-join';

                return (
                  <div key={seg.id}
                       className="rounded-2xl overflow-hidden"
                       style={{
                         background: 'white',
                         boxShadow: isLive ? `0 0 0 2px ${meta.color}, 0 4px 20px ${meta.color}20` : '0 1px 6px #0001',
                         transition: 'box-shadow 0.3s',
                       }}>
                    {/* Live bar */}
                    {isLive && (
                      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg,${meta.color},${meta.color}88)` }}>
                        <div className="h-full animate-pulse" style={{ background: meta.color, width: '100%' }} />
                      </div>
                    )}

                    <div className="p-4 flex items-center gap-4">
                      {/* Numéro et status */}
                      <div className="flex flex-col items-center gap-1.5 w-10 flex-shrink-0">
                        <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-black"
                             style={{ background: meta.bg, color: meta.color }}>
                          {i + 1}
                        </div>
                        {i < segments.length - 1 && (
                          <div className="w-px flex-1 min-h-4" style={{ background: isDone ? meta.color : '#e2e8f0' }} />
                        )}
                      </div>

                      {/* Infos */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <p className="text-sm font-black" style={{ color: '#1e293b' }}>
                            Session {seg.sequence}
                          </p>
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                                style={{ background: meta.bg, color: meta.color }}>
                            {isLive && <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: meta.color }} />}
                            <StatusIcon className="h-3 w-3" />
                            {meta.label}
                          </span>
                        </div>
                        <p className="text-xs" style={{ color: '#64748b' }}>
                          {fmtTime(seg.start_time)} – {fmtTime(seg.end_time)}
                          <span className="ml-2 text-xs" style={{ color: '#94a3b8' }}>({seg.duration_minutes} min)</span>
                        </p>

                        {/* Compte-à-rebours si en cours */}
                        {isLive && (
                          <div className="mt-1.5 flex items-center gap-2">
                            <span className="text-xs font-semibold" style={{ color: '#64748b' }}>Temps restant :</span>
                            <Countdown targetTime={seg.end_time} onExpire={fetchSegments} />
                          </div>
                        )}

                        {/* Participants count */}
                        {seg.participants_count > 0 && (
                          <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: '#94a3b8' }}>
                            <Users className="h-3 w-3" /> {seg.participants_count} participant(s)
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                        {/* Actions admin */}
                        {isAdmin && seg.status === 'PLANIFIEE' && (
                          <button onClick={() => handleStartSegment(seg.id)} disabled={!!startA}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50"
                                  style={{ background: '#059669' }}>
                            {startA ? <div className="h-3 w-3 rounded-full border border-white/30 border-t-white animate-spin" /> : <Play className="h-3 w-3" />}
                            Démarrer
                          </button>
                        )}
                        {isAdmin && isLive && (
                          <button onClick={() => handleEndSegment(seg)} disabled={!!endA}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50"
                                  style={{ background: '#ef4444' }}>
                            {endA ? <div className="h-3 w-3 rounded-full border border-white/30 border-t-white animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                            Terminer
                          </button>
                        )}
                        {isAdmin && isNext && (
                          <button onClick={() => handleStartSegment(seg.id)} disabled={!!startA}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50"
                                  style={{ background: '#fffbeb', color: '#d97706' }}>
                            {startA ? <div className="h-3 w-3 rounded-full border border-yellow-300 border-t-yellow-700 animate-spin" /> : <Play className="h-3 w-3" />}
                            Démarrer
                          </button>
                        )}

                        {/* Bouton Rejoindre pour étudiant ou admin */}
                        {(isLive || isNext) && seg.meeting_url && (
                          <button onClick={() => handleJoinSegment(seg)} disabled={!!joinA}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black text-white disabled:opacity-50"
                                  style={{ background: isLive ? `linear-gradient(135deg,${P},#be185d)` : '#64748b' }}>
                            {joinA
                              ? <div className="h-3 w-3 rounded-full border border-white/30 border-t-white animate-spin" />
                              : <ExternalLink className="h-3 w-3" />}
                            {isLive ? 'Rejoindre' : 'Préparer'}
                          </button>
                        )}

                        {/* Quitter si en cours (étudiant seulement) */}
                        {!isAdmin && isLive && (
                          <button onClick={() => handleLeaveSegment(seg.id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                                  style={{ background: '#fef2f2', color: '#dc2626' }}>
                            <LogOut className="h-3 w-3" /> Quitter
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Onglet Journal (admin seulement) */}
      {activeTab === 'logs' && isAdmin && (
        <div className="rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 6px #0001' }}>
          {logs.length === 0 ? (
            <div className="p-8 text-center" style={{ color: '#94a3b8' }}>
              <BarChart2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucun événement enregistré</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th className="px-4 py-3 text-left text-xs font-black" style={{ color: '#64748b' }}>Événement</th>
                  <th className="px-4 py-3 text-left text-xs font-black" style={{ color: '#64748b' }}>Détail</th>
                  <th className="px-4 py-3 text-left text-xs font-black" style={{ color: '#64748b' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={log.id} style={{ borderTop: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{ background: '#eef2ff', color: '#6366f1' }}>
                        {log.log_type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: '#374151' }}>{log.detail || '—'}</td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: '#94a3b8' }}>
                      {new Date(log.created_at).toLocaleString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
