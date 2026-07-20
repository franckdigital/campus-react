import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Shield, Plus, Edit, Trash2, LogIn, LogOut, CreditCard,
  UserCheck, Download, ChevronDown, ChevronUp, Activity,
  Calendar, User, Clock, Database
} from 'lucide-react';
import { usersService } from '../../services';
import { useApi } from '../../hooks/useApi';
import { useNotifications } from '../../components/Notifications';
import { useSite } from '../../contexts/SiteContext';
import {
  PageHeader, FilterBar, SearchInput, FilterSelect, Pagination
} from '../../components/ui/PageHeader';

const COLOR = '#475569';
const ITEMS_PER_PAGE = 20;

const ACTION_META = {
  CREATE:     { label: 'Création',    color: '#16a34a', bg: '#f0fdf4',  icon: <Plus size={14} /> },
  UPDATE:     { label: 'Modification',color: '#2563eb', bg: '#eff6ff',  icon: <Edit size={14} /> },
  DELETE:     { label: 'Suppression', color: '#ef4444', bg: '#fef2f2',  icon: <Trash2 size={14} /> },
  LOGIN:      { label: 'Connexion',   color: '#6366f1', bg: '#eef2ff',  icon: <LogIn size={14} /> },
  LOGOUT:     { label: 'Déconnexion', color: '#64748b', bg: '#f1f5f9',  icon: <LogOut size={14} /> },
  PAYMENT:    { label: 'Paiement',    color: '#d97706', bg: '#fffbeb',  icon: <CreditCard size={14} /> },
  ATTENDANCE: { label: 'Présence',    color: '#14b8a6', bg: '#f0fdfa',  icon: <UserCheck size={14} /> },
  EXPORT:     { label: 'Export',      color: '#7c3aed', bg: '#f5f3ff',  icon: <Download size={14} /> },
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `il y a ${diff}s`;
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  return `il y a ${Math.floor(diff / 86400)}j`;
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

function avatarColor(name) {
  const colors = ['#6366f1', '#f59e0b', '#14b8a6', '#ef4444', '#8b5cf6', '#3b82f6', '#ec4899', '#16a34a'];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = (name.charCodeAt(i) + hash * 31) | 0;
  return colors[Math.abs(hash) % colors.length];
}

function JsonViewer({ data }) {
  if (!data) return <p className="text-xs text-slate-400 italic">Aucune donnée</p>;
  let parsed = data;
  if (typeof data === 'string') {
    try { parsed = JSON.parse(data); } catch { return <pre className="text-xs text-slate-600 whitespace-pre-wrap">{data}</pre>; }
  }
  return (
    <pre className="text-[11px] text-slate-600 whitespace-pre-wrap overflow-auto max-h-48 rounded-lg p-3" style={{ background: '#f8fafc', border: '1px solid #f0f4f9' }}>
      {JSON.stringify(parsed, null, 2)}
    </pre>
  );
}

function LogRow({ log, idx }) {
  const [expanded, setExpanded] = useState(false);
  const meta = ACTION_META[log.action] || ACTION_META.UPDATE;
  const userName = log.user_name || log.user?.full_name || log.user?.username || 'Système';
  const bgColor = avatarColor(userName);

  const hasDetails = log.data_before || log.data_after || log.extra_data;

  return (
    <>
      <tr
        className="transition-colors"
        style={{ background: idx % 2 === 0 ? '#fafbff' : 'transparent' }}
        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
        onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fafbff' : 'transparent'}
      >
        {/* Action icon */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: meta.bg }}>
              <span style={{ color: meta.color }}>{meta.icon}</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full"
              style={{ color: meta.color, background: meta.bg }}>
              {meta.label}
            </span>
          </div>
        </td>

        {/* Who */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
              style={{ background: bgColor }}>
              {getInitials(userName)}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800">{userName}</p>
              {log.user?.role && <p className="text-[10px] text-slate-400">{log.user.role}</p>}
            </div>
          </div>
        </td>

        {/* What */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <Database size={13} color="#94a3b8" />
            <div>
              <p className="text-xs font-medium text-slate-700">
                {log.model || log.resource || '—'}
                {log.object_id && <span className="ml-1 text-slate-400 font-mono">#{log.object_id}</span>}
              </p>
              {log.description && <p className="text-[11px] text-slate-400 truncate max-w-[200px]">{log.description}</p>}
            </div>
          </div>
        </td>

        {/* When */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock size={12} color="#94a3b8" />
            <div>
              <p>{log.created_at ? new Date(log.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</p>
              <p className="text-[10px] text-slate-400">{timeAgo(log.created_at)}</p>
            </div>
          </div>
        </td>

        {/* Details btn */}
        <td className="px-4 py-3">
          {hasDetails ? (
            <button
              onClick={() => setExpanded(v => !v)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors"
              style={{
                color: expanded ? COLOR : '#94a3b8',
                background: expanded ? '#f1f5f9' : 'transparent',
                border: '1px solid #f0f4f9',
              }}>
              Détails {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
          ) : (
            <span className="text-[11px] text-slate-300">—</span>
          )}
        </td>
      </tr>

      {/* Expanded details row */}
      {expanded && hasDetails && (
        <tr style={{ background: '#fafbff' }}>
          <td colSpan={5} className="px-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {log.data_before != null && (
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Avant</p>
                  <JsonViewer data={log.data_before} />
                </div>
              )}
              {log.data_after != null && (
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Après</p>
                  <JsonViewer data={log.data_after} />
                </div>
              )}
              {log.extra_data != null && !log.data_before && !log.data_after && (
                <div className="col-span-2">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Données</p>
                  <JsonViewer data={log.extra_data} />
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function AuditLogs() {
  const { selectedSite } = useSite();
  const { notify } = useNotifications();
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterUser, setFilterUser] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const siteFilter = selectedSite !== 'all' ? { site: selectedSite } : {};

  const params = {
    search: search || undefined,
    action: filterAction !== 'all' ? filterAction : undefined,
    user: filterUser || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    page,
    ...siteFilter,
  };

  const { data: logsData, loading } = useApi(
    () => usersService.getAuditLogs(params),
    [search, filterAction, filterUser, dateFrom, dateTo, page, selectedSite],
    true
  );

  const logs = logsData?.results || logsData || [];
  const total = logsData?.count || logs.length;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const today = new Date().toISOString().slice(0, 10);
  const todayCount = logs.filter(l => l.created_at?.startsWith(today)).length;

  const uniqueUsers = [...new Set(logs.map(l => l.user_name || l.user?.full_name || '').filter(Boolean))];

  const kpis = [
    {
      label: 'Total événements', value: total,
      icon: <Activity size={20} color={COLOR} />, bg: '#f1f5f9',
    },
    {
      label: "Aujourd'hui", value: todayCount,
      icon: <Calendar size={20} color="#2563eb" />, bg: '#eff6ff',
    },
    {
      label: 'Utilisateurs actifs', value: uniqueUsers.length,
      icon: <User size={20} color="#16a34a" />, bg: '#f0fdf4',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Historique & Audit"
        subtitle="Journal des événements et actions utilisateurs"
        icon={Shield}
        iconColor={COLOR}
        iconBg="#f1f5f9"
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpis.map((k, i) => (
          <div key={i} className="rounded-2xl p-4 flex items-center gap-4" style={{ background: '#fff', border: '1.5px solid #f0f4f9' }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: k.bg }}>
              {k.icon}
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{k.label}</p>
              <p className="text-lg font-black text-slate-800 leading-tight">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <FilterBar>
        <SearchInput value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Rechercher un événement, modèle..." />
        <FilterSelect value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(1); }}>
          <option value="all">Toutes les actions</option>
          {Object.entries(ACTION_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
        </FilterSelect>
        <FilterSelect value={filterUser} onChange={e => { setFilterUser(e.target.value); setPage(1); }}>
          <option value="">Tous les utilisateurs</option>
          {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
        </FilterSelect>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Du</span>
            <input
              type="date"
              className="input-field text-xs"
              style={{ minWidth: '140px' }}
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(1); }}
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Au</span>
            <input
              type="date"
              className="input-field text-xs"
              style={{ minWidth: '140px' }}
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(1); }}
            />
          </div>
        </div>
      </FilterBar>

      {/* Timeline table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1.5px solid #f0f4f9' }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: `${COLOR} transparent transparent transparent` }} />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: '#f1f5f9' }}>
              <Shield size={28} color={COLOR} />
            </div>
            <p className="text-sm text-slate-400 font-medium">Aucun événement trouvé</p>
            <p className="text-xs text-slate-300">Modifiez les filtres pour élargir la recherche</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: 'linear-gradient(135deg,#fafbff,#f8fafc)', borderBottom: '1px solid #f0f4f9' }}>
                {['Action', 'Utilisateur', 'Ressource', 'Date', 'Détails'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log, idx) => (
                <LogRow key={log.id ?? idx} log={log} idx={idx} />
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} accentColor={COLOR} />
      )}
    </div>
  );
}
