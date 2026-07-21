import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Save, Building, GraduationCap, DollarSign, Bell, Shield, Palette, Plus, Edit, Trash2, X, Check, Settings as SettingsIcon, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { academicService, configService } from '../../services';
import { useApi } from '../../hooks/useApi';
import { PageHeader, IconBtn } from '../../components/ui/PageHeader';
import BackToParametres from '../../components/ui/BackToParametres';

const COLOR = '#6366f1'; const COLOR_BG = '#eef2ff'; const COLOR_ICON = '#e0e7ff';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal]       = useState(false);
  const [modalType, setModalType]       = useState('');
  const [confirmModal, setConfirmModal] = useState(null); // { message, label, onConfirm, error, loading }
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message }
  const toastTimer = useRef(null);
  const showToast = (type, message) => {
    setToast({ type, message });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ name: '', code: '', description: '', start_date: '', end_date: '', is_current: false });
  const SEMESTER_NAME_OPTIONS = [
    { value: 'S1', label: 'Semestre 1' }, { value: 'S2', label: 'Semestre 2' },
    { value: 'T1', label: 'Trimestre 1' }, { value: 'T2', label: 'Trimestre 2' }, { value: 'T3', label: 'Trimestre 3' },
  ];
  const [generalData, setGeneralData] = useState({ institution_name: 'CampusLMS', contact_email: 'contact@campus.com', phone: '+225 01 02 03 04 05', website: 'https://campus.com', address: "Abidjan, Côte d'Ivoire" });

  const [academicData, setAcademicData] = useState({
    id: null, name: '2025-2026', code: '2025-2026',
    start_date: '2025-09-01', end_date: '2026-06-30', is_current: true
  });

  // Persisted via apps.core's generic SystemConfig key/value store (see
  // services/configs.js) — the rest of the Finance tab (devise, délai,
  // frais de retard) is still local-only/unwired, unchanged from before.
  const [financeData, setFinanceData] = useState({ default_payment_method: 'Espèces', mobile_money_number: '', min_enrollment_payment: '' });

  const { data: academicYears, execute: fetchAcademicYears } = useApi(() => academicService.getAcademicYears(), [], true);
  const { data: semesters, execute: fetchSemesters } = useApi(() => academicService.getSemesters(), [], true);
  const { data: financeConfigs } = useApi(() => configService.list(), [], true);

  useEffect(() => {
    const rows = financeConfigs?.results || financeConfigs || [];
    const method = rows.find(r => r.key === 'default_payment_method');
    const number  = rows.find(r => r.key === 'mobile_money_number');
    const minEnrollment = rows.find(r => r.key === 'MIN_ENROLLMENT_PAYMENT');
    if (method || number || minEnrollment) {
      setFinanceData(prev => ({
        default_payment_method: method?.value || prev.default_payment_method,
        mobile_money_number: number?.value || prev.mobile_money_number,
        min_enrollment_payment: minEnrollment?.value ?? prev.min_enrollment_payment,
      }));
    }
  }, [financeConfigs]);

  useEffect(() => {
    const yearsList = academicYears?.results || academicYears || [];
    const currentYear = yearsList.find(y => y.is_current) || yearsList[0];
    if (currentYear) {
      setAcademicData({
        id: currentYear.id, name: currentYear.name,
        code: currentYear.code || currentYear.name,
        start_date: currentYear.start_date, end_date: currentYear.end_date,
        is_current: currentYear.is_current
      });
    }
  }, [academicYears]);

  const { data: departments, execute: fetchDepartments } = useApi(() => academicService.getDepartments?.() || Promise.resolve([]), [], true);

  const tabs = [
    { id: 'general',       label: 'Général',       icon: Building },
    { id: 'academic',      label: 'Académique',     icon: GraduationCap },
    { id: 'departments',   label: 'Départements',   icon: Building },
    { id: 'finance',       label: 'Finance',        icon: DollarSign },
    { id: 'notifications', label: 'Notifications',  icon: Bell },
    { id: 'security',      label: 'Sécurité',       icon: Shield },
    { id: 'appearance',    label: 'Apparence',      icon: Palette },
  ];

  const handleSaveAcademic = async () => {
    setSaving(true);
    try {
      const payload = {
        name: academicData.name,
        code: academicData.code || academicData.name.replace('-', ''),
        start_date: academicData.start_date,
        end_date: academicData.end_date,
        is_current: true
      };
      if (academicData.id) {
        await academicService.updateAcademicYear(academicData.id, payload);
      } else {
        const newYear = await academicService.createAcademicYear(payload);
        setAcademicData(prev => ({ ...prev, id: newYear.id }));
      }
      await fetchAcademicYears();
      showToast('success', 'Paramètres académiques sauvegardés avec succès');
    } catch (err) {
      console.error('Error saving academic year:', err);
      showToast('error', err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (section) => {
    setSaving(true);
    try {
      if (section === 'général') {
        await academicService.updateSettings?.(generalData) || await new Promise(r => setTimeout(r, 600));
      } else if (section === 'finance') {
        await configService.setValue('default_payment_method', financeData.default_payment_method);
        if (financeData.default_payment_method === 'Mobile Money') {
          await configService.setValue('mobile_money_number', financeData.mobile_money_number);
        }
        if (financeData.min_enrollment_payment !== '' && financeData.min_enrollment_payment != null) {
          await configService.setValue('MIN_ENROLLMENT_PAYMENT', String(financeData.min_enrollment_payment));
        }
      } else {
        await new Promise(r => setTimeout(r, 600));
      }
      showToast('success', `Paramètres ${section} sauvegardés avec succès`);
    } catch (err) {
      // Surface the real backend error instead of a generic message — a
      // silent, detail-free alert here is exactly what made the earlier
      // DRF validation failure (missing `site` in the unique_together
      // check) impossible to diagnose from the UI. api.js already flattens
      // DRF validation errors into err.message.
      showToast('error', `Erreur lors de la sauvegarde${err?.message ? ` : ${err.message}` : ''}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMobileMoneyNumber = () => {
    setConfirmModal({
      message: 'Supprimer le numéro Mobile Money ?',
      label: financeData.mobile_money_number,
      onConfirm: async () => {
        await configService.deleteValue('mobile_money_number');
        setFinanceData(p => ({ ...p, mobile_money_number: '' }));
        showToast('success', 'Numéro Mobile Money supprimé');
      },
    });
  };

  const openModal = (type, item = null) => {
    setModalType(type);
    setEditingItem(item);
    if (type === 'academicYear') {
      setFormData(item ? {
        name: item.name, code: item.code || '', description: '',
        start_date: item.start_date || '', end_date: item.end_date || '', is_current: item.is_current || false,
      } : { name: '', code: '', description: '', start_date: '', end_date: '', is_current: false });
    } else if (type === 'semester') {
      const yearsList = academicYears?.results || academicYears || [];
      setFormData(item ? {
        name: item.name, label: item.label || '', academic_year: item.academic_year || '',
        start_date: item.start_date || '', end_date: item.end_date || '', is_current: item.is_current || false,
      } : {
        name: 'S1', label: '', academic_year: yearsList.find(y => y.is_current)?.id || yearsList[0]?.id || '',
        start_date: '', end_date: '', is_current: false,
      });
    } else {
      setFormData(item ? { name: item.name, code: item.code || '', description: item.description || '', start_date: '', end_date: '', is_current: false } : { name: '', code: '', description: '', start_date: '', end_date: '', is_current: false });
    }
    setShowModal(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalType === 'department') {
        editingItem ? await academicService.updateDepartment(editingItem.id, formData) : await academicService.createDepartment(formData);
        fetchDepartments();
      } else if (modalType === 'academicYear') {
        const payload = { name: formData.name, code: formData.name.replace(/[-\/]/g, ''), start_date: formData.start_date, end_date: formData.end_date, is_current: formData.is_current };
        if (editingItem) { await academicService.updateAcademicYear(editingItem.id, payload); }
        else { await academicService.createAcademicYear(payload); }
        await fetchAcademicYears();
      } else if (modalType === 'semester') {
        if (!formData.academic_year) { showToast('error', "Sélectionnez une année académique"); return; }
        const payload = {
          academic_year: formData.academic_year, name: formData.name, label: formData.label,
          start_date: formData.start_date, end_date: formData.end_date, is_current: formData.is_current,
        };
        if (editingItem) { await academicService.updateSemester(editingItem.id, payload); }
        else { await academicService.createSemester(payload); }
        await fetchSemesters();
      }
      setShowModal(false);
      setFormData({ name: '', code: '', description: '' });
    } catch (err) {
      console.error('Error saving:', err);
      showToast('error', err?.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = (type, id, label = '') => {
    const LABELS = {
      academicYear:'cette année académique',
      department:  'ce département',
      semester:    'ce semestre',
    };
    setConfirmModal({
      message: `Supprimer ${LABELS[type] || 'cet élément'} ?`,
      label:   label || LABELS[type] || 'élément',
      onConfirm: async (setErr) => {
        if (type === 'department')  { await academicService.updateDepartment(id, { active: false }); fetchDepartments(); }
        else if (type === 'academicYear') { await academicService.deleteAcademicYear?.(id) || await academicService.updateAcademicYear(id, { is_current: false }); await fetchAcademicYears(); }
        else if (type === 'semester') { await academicService.deleteSemester(id); await fetchSemesters(); }
      },
    });
  };

  const departmentsList = departments?.results || departments || [];
  const semestersList = semesters?.results || semesters || [];

  const SaveBtn = ({ section }) => (
    <button onClick={() => section === 'academic' ? handleSaveAcademic() : handleSave(section)} disabled={saving}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
      style={{ background: COLOR }}
      onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
      onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
      <Save className="h-4 w-4" />
      {saving ? 'Sauvegarde…' : 'Sauvegarder'}
    </button>
  );

  return (
    <div className="animate-fade-in space-y-6">
      <BackToParametres />
      <PageHeader icon={SettingsIcon} iconColor={COLOR} iconBg={COLOR_ICON}
        title="Paramètres" subtitle="Gérez les paramètres de votre établissement" />

      <div className="card overflow-hidden">
        {/* Tabs */}
        <div className="flex overflow-x-auto" style={{ borderBottom: '1px solid #f1f5f9' }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-5 py-3.5 text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0"
                style={{
                  color: active ? COLOR : '#64748b',
                  borderBottom: active ? `2px solid ${COLOR}` : '2px solid transparent',
                  background: active ? COLOR_BG : 'transparent'
                }}>
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {/* GENERAL */}
          {activeTab === 'general' && (
            <div className="space-y-5 max-w-2xl">
              <div>
                <p className="text-sm font-bold mb-0.5" style={{ color: '#0f172a' }}>Informations générales</p>
                <p className="text-xs" style={{ color: '#94a3b8' }}>Configurez les informations de base de votre établissement</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: '#475569' }}>Nom de l'établissement</label>
                  <input type="text" value={generalData.institution_name}
                    onChange={e => setGeneralData(p => ({ ...p, institution_name: e.target.value }))}
                    className="input-field" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: '#475569' }}>Email de contact</label>
                  <input type="email" value={generalData.contact_email}
                    onChange={e => setGeneralData(p => ({ ...p, contact_email: e.target.value }))}
                    className="input-field" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: '#475569' }}>Téléphone</label>
                  <input type="tel" value={generalData.phone}
                    onChange={e => setGeneralData(p => ({ ...p, phone: e.target.value }))}
                    className="input-field" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: '#475569' }}>Site web</label>
                  <input type="url" value={generalData.website}
                    onChange={e => setGeneralData(p => ({ ...p, website: e.target.value }))}
                    className="input-field" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold mb-1.5" style={{ color: '#475569' }}>Adresse</label>
                  <textarea rows={3} value={generalData.address}
                    onChange={e => setGeneralData(p => ({ ...p, address: e.target.value }))}
                    className="input-field resize-none" />
                </div>
              </div>
              <SaveBtn section="général" />
            </div>
          )}

          {/* ACADEMIC */}
          {activeTab === 'academic' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold" style={{ color: '#0f172a' }}>Années académiques</p>
                  <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>Gérez les années académiques de votre établissement</p>
                </div>
                <button onClick={() => openModal('academicYear')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                  style={{ background: COLOR }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                  <Plus className="h-4 w-4" /> Ajouter une année
                </button>
              </div>

              {(() => {
                const yearsList = academicYears?.results || academicYears || [];
                return yearsList.length === 0 ? (
                  <div className="flex flex-col items-center py-12">
                    <GraduationCap className="h-10 w-10 mb-3 opacity-20" style={{ color: '#64748b' }} />
                    <p className="text-sm" style={{ color: '#94a3b8' }}>Aucune année académique</p>
                  </div>
                ) : (
                  <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid #f0f4f9' }}>
                    <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ background: 'linear-gradient(135deg,#fafbff,#f8fafc)', borderBottom: '1px solid #f0f4f9' }}>
                          {['Année académique', 'Date de début', 'Date de fin', 'Statut', 'Actions'].map((h, i) => (
                            <th key={i} className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {yearsList.map((yr, idx) => (
                          <tr key={yr.id} style={{ borderBottom: '1px solid #f8fafc', background: idx % 2 !== 0 ? '#fafbff' : 'transparent' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f5f3ff30'}
                            onMouseLeave={e => e.currentTarget.style.background = idx % 2 !== 0 ? '#fafbff' : 'transparent'}>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: COLOR_BG }}>
                                  <GraduationCap className="h-4 w-4" style={{ color: COLOR }} />
                                </div>
                                <span className="text-sm font-bold" style={{ color: '#0f172a' }}>{yr.name}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-xs" style={{ color: '#475569' }}>
                              {yr.start_date ? new Date(yr.start_date).toLocaleDateString('fr-FR') : '—'}
                            </td>
                            <td className="px-5 py-3 text-xs" style={{ color: '#475569' }}>
                              {yr.end_date ? new Date(yr.end_date).toLocaleDateString('fr-FR') : '—'}
                            </td>
                            <td className="px-5 py-3">
                              {yr.is_current ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold" style={{ background: '#d1fae5', color: '#059669' }}>
                                  <Check className="h-3 w-3" /> En cours
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold" style={{ background: '#f1f5f9', color: '#94a3b8' }}>Passée</span>
                              )}
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-1">
                                <IconBtn onClick={() => openModal('academicYear', yr)} icon={Edit} color={COLOR} hoverBg={COLOR_BG} title="Modifier" />
                                <IconBtn onClick={() => handleDelete('academicYear', yr.id)} icon={Trash2} color="#ef4444" hoverBg="#fee2e2" title="Supprimer" />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid #f1f5f9' }}>
                <div>
                  <p className="text-sm font-bold" style={{ color: '#0f172a' }}>Semestres</p>
                  <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>Gérez les semestres/trimestres de chaque année académique</p>
                </div>
                <button onClick={() => openModal('semester')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                  style={{ background: COLOR }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                  <Plus className="h-4 w-4" /> Ajouter un semestre
                </button>
              </div>

              {semestersList.length === 0 ? (
                <div className="flex flex-col items-center py-12">
                  <GraduationCap className="h-10 w-10 mb-3 opacity-20" style={{ color: '#64748b' }} />
                  <p className="text-sm" style={{ color: '#94a3b8' }}>Aucun semestre — créez-en un pour qu'il apparaisse dans les listes déroulantes (emploi du temps, notes…)</p>
                </div>
              ) : (
                <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid #f0f4f9' }}>
                  <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: 'linear-gradient(135deg,#fafbff,#f8fafc)', borderBottom: '1px solid #f0f4f9' }}>
                        {['Année académique', 'Semestre', 'Date de début', 'Date de fin', 'Statut', 'Actions'].map((h, i) => (
                          <th key={i} className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {semestersList.map((sem, idx) => (
                        <tr key={sem.id} style={{ borderBottom: '1px solid #f8fafc', background: idx % 2 !== 0 ? '#fafbff' : 'transparent' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f5f3ff30'}
                          onMouseLeave={e => e.currentTarget.style.background = idx % 2 !== 0 ? '#fafbff' : 'transparent'}>
                          <td className="px-5 py-3 text-xs font-semibold" style={{ color: '#475569' }}>{sem.academic_year_name || '—'}</td>
                          <td className="px-5 py-3">
                            <span className="text-sm font-bold" style={{ color: '#0f172a' }}>
                              {sem.label || SEMESTER_NAME_OPTIONS.find(o => o.value === sem.name)?.label || sem.name}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-xs" style={{ color: '#475569' }}>
                            {sem.start_date ? new Date(sem.start_date).toLocaleDateString('fr-FR') : '—'}
                          </td>
                          <td className="px-5 py-3 text-xs" style={{ color: '#475569' }}>
                            {sem.end_date ? new Date(sem.end_date).toLocaleDateString('fr-FR') : '—'}
                          </td>
                          <td className="px-5 py-3">
                            {sem.is_current ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold" style={{ background: '#d1fae5', color: '#059669' }}>
                                <Check className="h-3 w-3" /> En cours
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold" style={{ background: '#f1f5f9', color: '#94a3b8' }}>—</span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1">
                              <IconBtn onClick={() => openModal('semester', sem)} icon={Edit} color={COLOR} hoverBg={COLOR_BG} title="Modifier" />
                              <IconBtn onClick={() => handleDelete('semester', sem.id, sem.label || sem.name)} icon={Trash2} color="#ef4444" hoverBg="#fee2e2" title="Supprimer" />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DEPARTMENTS */}
          {activeTab === 'departments' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold" style={{ color: '#0f172a' }}>Départements</p>
                  <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>Gérez les départements de votre établissement</p>
                </div>
                <button onClick={() => openModal('department')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                  style={{ background: COLOR }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                  <Plus className="h-4 w-4" /> Ajouter un département
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {departmentsList.map((dept) => (
                  <div key={dept.id} className="card p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="text-sm font-bold truncate" style={{ color: '#1e293b' }}>{dept.name}</p>
                        <p className="text-xs font-semibold mt-0.5" style={{ color: COLOR }}>{dept.code}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <IconBtn onClick={() => openModal('department', dept)} icon={Edit} color={COLOR} hoverBg={COLOR_BG} title="Modifier" />
                        <IconBtn onClick={() => handleDelete('department', dept.id)} icon={Trash2} color="#ef4444" hoverBg="#fee2e2" title="Supprimer" />
                      </div>
                    </div>
                  </div>
                ))}
                {departmentsList.length === 0 && (
                  <div className="col-span-full flex flex-col items-center py-12">
                    <Building className="h-10 w-10 mb-3 opacity-20" style={{ color: '#64748b' }} />
                    <p className="text-sm" style={{ color: '#94a3b8' }}>Aucun département</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FINANCE */}
          {activeTab === 'finance' && (
            <div className="space-y-5 max-w-2xl">
              <div>
                <p className="text-sm font-bold" style={{ color: '#0f172a' }}>Paramètres financiers</p>
                <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>Configurez les options de facturation et de paiement</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: '#475569' }}>Devise</label>
                  <select className="input-field cursor-pointer">
                    <option>FCFA</option>
                    <option>EUR</option>
                    <option>USD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: '#475569' }}>Délai de paiement (jours)</label>
                  <input type="number" defaultValue="30" className="input-field" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: '#475569' }}>Frais de retard (%)</label>
                  <input type="number" defaultValue="5" className="input-field" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: '#475569' }}>Mode de paiement par défaut</label>
                  <select className="input-field cursor-pointer" value={financeData.default_payment_method}
                          onChange={e => setFinanceData(p => ({ ...p, default_payment_method: e.target.value }))}>
                    <option>Espèces</option>
                    <option>Virement bancaire</option>
                    <option>Mobile Money</option>
                    <option>Carte bancaire</option>
                  </select>
                </div>
                {financeData.default_payment_method === 'Mobile Money' && (
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: '#475569' }}>Numéro Mobile Money (destinataire des paiements)</label>
                    <div className="flex gap-2">
                      <input type="tel" placeholder="Ex : 07 00 00 00 00" className="input-field flex-1"
                             value={financeData.mobile_money_number}
                             onChange={e => setFinanceData(p => ({ ...p, mobile_money_number: e.target.value }))} />
                      {financeData.mobile_money_number && (
                        <button type="button" onClick={handleDeleteMobileMoneyNumber} disabled={saving}
                                title="Supprimer ce numéro"
                                className="flex-shrink-0 px-3 rounded-xl border transition-colors disabled:opacity-50"
                                style={{ borderColor: '#fecaca', color: '#dc2626' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] mt-1" style={{ color: '#94a3b8' }}>
                      Affiché en lecture seule aux étudiants pour qu'ils sachent où envoyer leur paiement Mobile Money.
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: '#475569' }}>
                    Seuil minimum pour valider l'inscription (FCFA)
                  </label>
                  <input type="number" min="0" step="1" placeholder="Ex : 50000" className="input-field"
                         value={financeData.min_enrollment_payment}
                         onChange={e => setFinanceData(p => ({ ...p, min_enrollment_payment: e.target.value }))}
                         onWheel={e => e.target.blur()} />
                  <p className="text-[11px] mt-1" style={{ color: '#94a3b8' }}>
                    Montant cumulé à payer sur la scolarité pour qu'un étudiant soit considéré "inscrit". Par défaut : 50 000 FCFA.
                  </p>
                </div>
              </div>
              <SaveBtn section="finance" />
            </div>
          )}

          {/* NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="space-y-5 max-w-2xl">
              <div>
                <p className="text-sm font-bold" style={{ color: '#0f172a' }}>Notifications</p>
                <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>Choisissez les événements pour lesquels vous souhaitez être notifié</p>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Nouvelles inscriptions', description: 'Recevoir une notification pour chaque nouvelle inscription' },
                  { label: 'Paiements reçus', description: "Notification lors de la réception d'un paiement" },
                  { label: 'Absences', description: "Alerte en cas d'absence d'un étudiant" },
                  { label: 'Notes publiées', description: 'Notification quand les notes sont publiées' },
                  { label: 'Événements', description: 'Rappels pour les événements à venir' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-xl" style={{ border: '1px solid #f1f5f9', background: '#fafafe' }}>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#1e293b' }}>{item.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{item.description}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-4">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all"
                        style={{ '--tw-peer-checked-bg': COLOR }}
                        onMouseDown={() => {}}
                      />
                      <style>{`.peer:checked ~ div { background: ${COLOR} !important; }`}</style>
                    </label>
                  </div>
                ))}
              </div>
              <SaveBtn section="notifications" />
            </div>
          )}

          {/* SECURITY */}
          {activeTab === 'security' && (
            <div className="space-y-5 max-w-2xl">
              <div>
                <p className="text-sm font-bold" style={{ color: '#0f172a' }}>Sécurité</p>
                <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>Configurez les paramètres de sécurité de votre établissement</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-xl" style={{ border: '1px solid #f1f5f9', background: '#fafafe' }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#1e293b' }}>Authentification à deux facteurs</p>
                    <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>Ajouter une couche de sécurité supplémentaire</p>
                  </div>
                  <input type="checkbox" className="h-4 w-4 cursor-pointer rounded" style={{ accentColor: COLOR }} />
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl" style={{ border: '1px solid #f1f5f9', background: '#fafafe' }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#1e293b' }}>Expiration de session</p>
                    <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>Déconnecter automatiquement après inactivité</p>
                  </div>
                  <select className="input-field w-auto text-xs" style={{ padding: '6px 10px' }}>
                    <option>15 minutes</option>
                    <option>30 minutes</option>
                    <option>1 heure</option>
                    <option>2 heures</option>
                  </select>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl" style={{ border: '1px solid #f1f5f9', background: '#fafafe' }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#1e293b' }}>Politique de mot de passe</p>
                    <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>Exiger des mots de passe forts</p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-4 w-4 cursor-pointer rounded" style={{ accentColor: COLOR }} />
                </div>
              </div>
              <SaveBtn section="sécurité" />
            </div>
          )}

          {/* APPEARANCE */}
          {activeTab === 'appearance' && (
            <div className="space-y-5 max-w-2xl">
              <div>
                <p className="text-sm font-bold" style={{ color: '#0f172a' }}>Apparence</p>
                <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>Personnalisez l'apparence de votre interface</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: '#475569' }}>Thème</label>
                  <select className="input-field cursor-pointer">
                    <option>Clair</option>
                    <option>Sombre</option>
                    <option>Automatique</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: '#475569' }}>Couleur principale</label>
                  <input type="color" defaultValue="#3b82f6" className="input-field h-10 cursor-pointer p-1" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: '#475569' }}>Langue</label>
                  <select className="input-field cursor-pointer">
                    <option>Français</option>
                    <option>English</option>
                    <option>العربية</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: '#475569' }}>Format de date</label>
                  <select className="input-field cursor-pointer">
                    <option>DD/MM/YYYY</option>
                    <option>MM/DD/YYYY</option>
                    <option>YYYY-MM-DD</option>
                  </select>
                </div>
              </div>
              <SaveBtn section="apparence" />
            </div>
          )}
        </div>
      </div>

      {/* ── Confirm Delete Modal ── */}
      {confirmModal && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(10px)', zIndex: 9999 }}
          onClick={() => setConfirmModal(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm overflow-hidden"
            style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.22)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Top accent bar */}
            <div style={{ height: 4, background: 'linear-gradient(90deg,#ef4444,#f97316)', borderRadius: '16px 16px 0 0' }} />

            {/* Icon + content */}
            <div className="px-6 pt-7 pb-5 flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-2xl flex items-center justify-center mb-4"
                   style={{ background: '#fff1f2', border: '1.5px solid #fecdd3' }}>
                <AlertTriangle className="h-8 w-8" style={{ color: '#ef4444' }} />
              </div>
              <h3 className="text-base font-bold mb-1" style={{ color: '#0f172a' }}>
                {confirmModal.message}
              </h3>
              {confirmModal.label && confirmModal.label !== confirmModal.message && (
                <p className="text-sm font-semibold px-3 py-1 rounded-lg mt-1"
                   style={{ background: '#f1f5f9', color: '#475569' }}>
                  {confirmModal.label}
                </p>
              )}
              <p className="text-xs mt-3" style={{ color: '#94a3b8' }}>
                Cette action est irréversible.
              </p>
              {confirmModal.error && (
                <p className="text-xs mt-3 px-3 py-2 rounded-lg w-full text-left"
                   style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                  {confirmModal.error}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:bg-slate-50"
                style={{ color: '#64748b', borderColor: '#e2e8f0', background: '#f8fafc' }}
              >
                Annuler
              </button>
              <button
                disabled={deleteLoading}
                onClick={async () => {
                  setDeleteLoading(true);
                  try {
                    await confirmModal.onConfirm();
                    setConfirmModal(null);
                  } catch (err) {
                    const msg = err?.response?.data?.detail || err?.response?.data?.[0] || 'Impossible de supprimer cet élément.';
                    setConfirmModal(prev => prev ? { ...prev, error: msg } : null);
                  } finally {
                    setDeleteLoading(false);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: '0 4px 14px rgba(239,68,68,0.35)' }}
              >
                {deleteLoading ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Toast notification (replaces native alert()) ── */}
      {toast && createPortal(
        <div className="fixed top-6 right-6 z-[9999] flex items-start gap-3 px-4 py-3.5 rounded-2xl max-w-sm"
             style={{
               background: 'white',
               boxShadow: '0 16px 40px rgba(0,0,0,0.18)',
               borderLeft: `4px solid ${toast.type === 'success' ? '#059669' : '#ef4444'}`,
               animation: 'settingsToastIn .25s ease',
             }}>
          <style>{`@keyframes settingsToastIn{from{opacity:0;transform:translate(12px,-8px)}to{opacity:1;transform:translate(0,0)}}`}</style>
          <div className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{ background: toast.type === 'success' ? '#f0fdf4' : '#fef2f2' }}>
            {toast.type === 'success'
              ? <CheckCircle className="h-4 w-4" style={{ color: '#059669' }} />
              : <XCircle className="h-4 w-4" style={{ color: '#ef4444' }} />}
          </div>
          <p className="text-sm font-semibold pt-1 flex-1" style={{ color: '#1e293b' }}>{toast.message}</p>
          <button onClick={() => setToast(null)} className="h-6 w-6 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors flex-shrink-0">
            <X className="h-3.5 w-3.5" style={{ color: '#94a3b8' }} />
          </button>
        </div>,
        document.body
      )}

      {/* Generic Modal (department / academicYear) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(8,12,36,0.62)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
          onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <h2 className="text-lg font-bold" style={{ color: '#0f172a' }}>
                {editingItem ? 'Modifier' : 'Ajouter'} {modalType === 'academicYear' ? 'une année académique' : modalType === 'semester' ? 'un semestre' : 'un département'}
              </h2>
              <button onClick={() => setShowModal(false)} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors">
                <X className="h-4 w-4" style={{ color: '#64748b' }} />
              </button>
            </div>
            <form onSubmit={handleModalSubmit} className="p-6 space-y-4">
              {modalType === 'academicYear' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: '#475569' }}>Nom de l'année *</label>
                    <input type="text" required value={formData.name} placeholder="Ex: 2025-2026"
                      onChange={e => setFormData({ ...formData, name: e.target.value })} className="input-field" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: '#475569' }}>Date de début</label>
                      <input type="date" value={formData.start_date}
                        onChange={e => setFormData({ ...formData, start_date: e.target.value })} className="input-field" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: '#475569' }}>Date de fin</label>
                      <input type="date" value={formData.end_date}
                        onChange={e => setFormData({ ...formData, end_date: e.target.value })} className="input-field" />
                    </div>
                  </div>
                  <label className="flex items-center gap-3 p-3 rounded-xl cursor-pointer" style={{ background: COLOR_BG }}>
                    <input type="checkbox" checked={formData.is_current}
                      onChange={e => setFormData({ ...formData, is_current: e.target.checked })}
                      className="h-4 w-4 rounded cursor-pointer" style={{ accentColor: COLOR }} />
                    <span className="text-sm font-semibold" style={{ color: '#1e293b' }}>Marquer comme année en cours</span>
                  </label>
                </>
              ) : modalType === 'semester' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: '#475569' }}>Année académique *</label>
                    <select required value={formData.academic_year}
                      onChange={e => setFormData({ ...formData, academic_year: e.target.value })} className="input-field cursor-pointer">
                      <option value="">Sélectionner…</option>
                      {(academicYears?.results || academicYears || []).map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: '#475569' }}>Semestre *</label>
                    <select required value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })} className="input-field cursor-pointer">
                      {SEMESTER_NAME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: '#475569' }}>Libellé</label>
                    <input type="text" value={formData.label} placeholder="Ex: Semestre 1 — 2025/2026"
                      onChange={e => setFormData({ ...formData, label: e.target.value })} className="input-field" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: '#475569' }}>Date de début *</label>
                      <input type="date" required value={formData.start_date}
                        onChange={e => setFormData({ ...formData, start_date: e.target.value })} className="input-field" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: '#475569' }}>Date de fin *</label>
                      <input type="date" required value={formData.end_date}
                        onChange={e => setFormData({ ...formData, end_date: e.target.value })} className="input-field" />
                    </div>
                  </div>
                  <label className="flex items-center gap-3 p-3 rounded-xl cursor-pointer" style={{ background: COLOR_BG }}>
                    <input type="checkbox" checked={formData.is_current}
                      onChange={e => setFormData({ ...formData, is_current: e.target.checked })}
                      className="h-4 w-4 rounded cursor-pointer" style={{ accentColor: COLOR }} />
                    <span className="text-sm font-semibold" style={{ color: '#1e293b' }}>Marquer comme semestre en cours</span>
                  </label>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: '#475569' }}>Nom *</label>
                    <input type="text" required value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: '#475569' }}>Code</label>
                    <input type="text" value={formData.code}
                      onChange={e => setFormData({ ...formData, code: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: '#475569' }}>Description</label>
                    <textarea rows={3} value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })} className="input-field resize-none" />
                  </div>
                </>
              )}
              <div className="flex items-center justify-end gap-3 pt-2" style={{ borderTop: '1px solid #f1f5f9' }}>
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold border hover:bg-slate-50 transition-colors"
                  style={{ color: '#64748b', borderColor: '#e2e8f0' }}>Annuler</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                  style={{ background: COLOR }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                  {editingItem ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
