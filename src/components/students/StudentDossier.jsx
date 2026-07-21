import { useState, useEffect } from 'react';
import { 
  X, FileText, Download, Upload, Eye, Calendar, User, 
  BookOpen, GraduationCap, Award, ClipboardList, 
  FileCheck, AlertCircle, CheckCircle, Clock, Folder,
  Plus, Trash2, Edit, CreditCard, Search
} from 'lucide-react';
import { studentsService, studentFilesService } from '../../services/students';
import { documentsService } from '../../services/documents';
import { academicService } from '../../services/academic';
import { financeService } from '../../services';
import { useApi } from '../../hooks/useApi';

export default function StudentDossier({ student, onClose }) {
  const [activeTab, setActiveTab] = useState('info');
  const [dossierData, setDossierData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddFileModal, setShowAddFileModal] = useState(false);
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);

  // Charger le dossier complet
  useEffect(() => {
    const fetchDossier = async () => {
      try {
        setLoading(true);
        const response = await studentsService.getDossier(student.id);
        console.log('Dossier data from backend:', response);
        console.log('Financial fields:', {
          is_enrolled: response?.is_enrolled,
          tuition_fee: response?.tuition_fee,
          total_paid: response?.total_paid,
          remaining_balance: response?.remaining_balance
        });
        setDossierData(response);
      } catch (error) {
        console.error('Error fetching dossier:', error);
      } finally {
        setLoading(false);
      }
    };

    if (student?.id) {
      fetchDossier();
    }
  }, [student]);

  const { data: enrollments } = useApi(
    () => academicService.getEnrollments({ student: student.id }),
    [student.id],
    true
  );

  const tabs = [
    { id: 'info', label: 'Informations', icon: User },
    { id: 'parcours', label: 'Parcours académique', icon: BookOpen },
    { id: 'paiements', label: 'Paiements & Factures', icon: Award },
    { id: 'absences', label: 'Absences', icon: AlertCircle },
    { id: 'documents', label: 'Documents (GED)', icon: FileText },
    { id: 'fichiers', label: 'Fichiers dossier', icon: Folder },
    { id: 'carte', label: 'Carte étudiant', icon: CreditCard },
  ];

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center"
           style={{ background: 'rgba(8,12,36,0.62)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4"
             style={{ boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }}>
          <div className="h-12 w-12 rounded-full border-[3px] border-indigo-100 border-t-indigo-600 animate-spin" />
          <p className="text-sm font-semibold" style={{ color: '#64748b' }}>Chargement du dossier…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(8,12,36,0.62)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
           style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.25)' }}>
        {/* Header accent stripe */}
        <div className="h-1 flex-shrink-0" style={{ background: 'linear-gradient(90deg, #1d4ed8, #4f46e5, #7c3aed)' }} />

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between flex-shrink-0"
             style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #4f46e5 60%, #7c3aed 100%)' }}>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center"
                 style={{ background: 'rgba(255,255,255,0.15)', boxShadow: '0 0 0 3px rgba(255,255,255,0.3)' }}>
              {dossierData?.photo ? (
                <img src={dossierData.photo} alt="" className="h-full w-full object-cover" />
              ) : (
                <User className="h-8 w-8" style={{ color: 'rgba(255,255,255,0.8)' }} />
              )}
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white" style={{ letterSpacing: '-0.02em' }}>
                {dossierData?.user?.full_name}
              </h2>
              <p className="text-sm font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
                #{dossierData?.matricule}
              </p>
              {dossierData?.site_name && (
                <p className="text-xs mt-1 font-semibold px-2 py-0.5 rounded-lg inline-block"
                   style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)' }}>
                  {dossierData.site_name}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose}
            className="h-9 w-9 rounded-xl flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.12)' }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.22)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.12)'}>
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 px-4 pt-3 pb-0" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <div className="flex gap-1 overflow-x-auto pb-3">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0"
                  style={active
                    ? { background: '#eff6ff', color: '#2563eb', border: '1.5px solid #bfdbfe' }
                    : { color: '#64748b', border: '1.5px solid transparent' }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background='#f8fafc'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background='transparent'; }}>
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'info' && <InfoTab dossier={dossierData} />}
          {activeTab === 'parcours' && <ParcoursTab enrollments={enrollments?.results || []} studentId={student.id} />}
          {activeTab === 'paiements' && <PaiementsTab studentId={student.id} studentData={dossierData} />}
          {activeTab === 'absences' && <AbsencesTab studentId={student.id} />}
          {activeTab === 'documents' && <DocumentsTab studentId={student.id} />}
          {activeTab === 'fichiers' && <FichiersTab files={dossierData?.files || []} studentId={student.id} />}
          {activeTab === 'carte' && <CarteTab cards={dossierData?.cards || []} studentId={student.id} dossier={dossierData} />}
        </div>
      </div>
    </div>
  );
}

// Onglet Informations personnelles
function InfoTab({ dossier }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InfoCard title="Informations personnelles">
          <InfoRow label="Nom complet" value={dossier?.user?.full_name} />
          <InfoRow label="Email" value={dossier?.user?.email} />
          <InfoRow label="Téléphone" value={dossier?.user?.phone} />
          <InfoRow label="Genre" value={dossier?.gender === 'M' ? 'Masculin' : 'Féminin'} />
          <InfoRow label="Date de naissance" value={new Date(dossier?.birth_date).toLocaleDateString('fr-FR')} />
          <InfoRow label="Lieu de naissance" value={dossier?.birth_place} />
          <InfoRow label="Nationalité" value={dossier?.nationality} />
        </InfoCard>

        <InfoCard title="Informations académiques">
          <InfoRow label="Matricule" value={dossier?.matricule} />
          <InfoRow label="Site" value={dossier?.site_name} />
          <InfoRow label="Statut" value={dossier?.status} />
          <InfoRow label="Date d'admission" value={new Date(dossier?.admission_date).toLocaleDateString('fr-FR')} />
          {dossier?.graduation_date && (
            <InfoRow label="Date de diplôme" value={new Date(dossier.graduation_date).toLocaleDateString('fr-FR')} />
          )}
        </InfoCard>

        <InfoCard title="Adresse">
          <InfoRow label="Adresse" value={dossier?.address} />
          <InfoRow label="Ville" value={dossier?.city} />
        </InfoCard>

        <InfoCard title="Contact d'urgence">
          <InfoRow label="Nom" value={dossier?.emergency_contact_name} />
          <InfoRow label="Téléphone" value={dossier?.emergency_contact_phone} />
          <InfoRow label="Relation" value={dossier?.emergency_contact_relation} />
        </InfoCard>
      </div>

      {dossier?.parents && dossier.parents.length > 0 && (
        <InfoCard title="Parents / Tuteurs" color="#7c3aed">
          <div className="space-y-2.5">
            {dossier.parents.map((parent) => (
              <div key={parent.id} className="p-3 rounded-xl" style={{ background: '#fafafa', border: '1.5px solid #f1f5f9' }}>
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <p className="text-sm font-bold" style={{ color: '#1e293b' }}>{parent.parent_name}</p>
                    <p className="text-xs" style={{ color: '#94a3b8' }}>{parent.relationship}</p>
                  </div>
                  {parent.is_primary && (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                          style={{ background: '#dbeafe', color: '#1d4ed8' }}>Principal</span>
                  )}
                </div>
                <div className="flex gap-4 text-xs" style={{ color: '#64748b' }}>
                  {parent.parent_email && <span>✉ {parent.parent_email}</span>}
                  {parent.parent_phone && <span>📱 {parent.parent_phone}</span>}
                </div>
              </div>
            ))}
          </div>
        </InfoCard>
      )}

      {dossier?.medical_info && (
        <InfoCard title="Informations médicales">
          <p className="text-gray-700 whitespace-pre-wrap">{dossier.medical_info}</p>
        </InfoCard>
      )}

      {dossier?.notes && (
        <InfoCard title="Notes">
          <p className="text-gray-700 whitespace-pre-wrap">{dossier.notes}</p>
        </InfoCard>
      )}
    </div>
  );
}

// Onglet Parcours académique
function ParcoursTab({ enrollments, studentId }) {
  const [showEnrollModal, setShowEnrollModal] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Historique des inscriptions</h3>
        <button
          onClick={() => setShowEnrollModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nouvelle inscription
        </button>
      </div>

      {enrollments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #ede9fe, #7c3aed18)' }}>
            <GraduationCap className="h-7 w-7" style={{ color: '#7c3aed' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: '#475569' }}>Aucune inscription enregistrée</p>
        </div>
      ) : (
        <div className="space-y-3">
          {enrollments.map((enrollment) => {
            const statusMap = { ENROLLED: { label: 'Inscrit', color: '#059669', bg: '#d1fae5' }, ACTIVE: { label: 'Actif', color: '#059669', bg: '#d1fae5' }, GRADUATED: { label: 'Diplômé', color: '#2563eb', bg: '#dbeafe' }, COMPLETED: { label: 'Terminé', color: '#2563eb', bg: '#dbeafe' }, DROPPED: { label: 'Abandonné', color: '#ef4444', bg: '#fee2e2' } };
            const st = statusMap[enrollment.status] || { label: enrollment.status, color: '#64748b', bg: '#f1f5f9' };
            return (
              <div key={enrollment.id} className="rounded-2xl overflow-hidden transition-all"
                   style={{ border: '1.5px solid #f1f5f9' }}
                   onMouseEnter={e => e.currentTarget.style.borderColor='#7c3aed30'}
                   onMouseLeave={e => e.currentTarget.style.borderColor='#f1f5f9'}>
                <div className="h-1" style={{ background: 'linear-gradient(90deg, #7c3aed, #7c3aed60)' }} />
                <div className="p-4 flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                       style={{ background: 'linear-gradient(135deg, #ede9fe, #7c3aed22)' }}>
                    <BookOpen className="h-5 w-5" style={{ color: '#7c3aed' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-bold" style={{ color: '#1e293b' }}>
                        {enrollment.class_name || enrollment.class_obj?.name}
                      </h4>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                            style={{ background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs" style={{ color: '#64748b' }}>
                      <span>{enrollment.academic_year_name || enrollment.academic_year?.name}</span>
                      {enrollment.enrollment_date && (
                        <span>· Inscrit le {new Date(enrollment.enrollment_date).toLocaleDateString('fr-FR')}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Onglet Documents (GED)
function DocumentsTab({ studentId }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await documentsService.getAll({ student: studentId });
        setDocuments(response?.results || response || []);
      } catch (error) {
        console.error('Error fetching documents:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchCategories = async () => {
      try {
        const response = await documentsService.getCategories();
        setCategories(response?.results || response || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    fetchDocuments();
    fetchCategories();
  }, [studentId]);

  const handleDownload = async (doc) => {
    try {
      const blob = await documentsService.download(doc.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Erreur lors du téléchargement');
    }
  };

  const handleValidate = async (docId) => {
    try {
      await documentsService.validate(docId, 'Document validé par l\'administration');
      const response = await documentsService.getAll({ student: studentId });
      setDocuments(response?.results || response || []);
    } catch (error) {
      console.error('Error validating document:', error);
      alert('Erreur lors de la validation');
    }
  };

  const handleReject = async (docId) => {
    const notes = prompt('Raison du rejet:');
    if (!notes) return;
    
    try {
      await documentsService.reject(docId, notes);
      const response = await documentsService.getAll({ student: studentId });
      setDocuments(response?.results || response || []);
    } catch (error) {
      console.error('Error rejecting document:', error);
      alert('Erreur lors du rejet');
    }
  };

  // Filtrer les documents
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || doc.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || doc.category?.id === parseInt(filterCategory);
    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h3 className="text-lg font-semibold text-gray-900">Documents GED</h3>
        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Upload className="h-4 w-4" />
          Téléverser un document
        </button>
      </div>

      {/* Recherche et filtres */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Rechercher un document..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">Tous les statuts</option>
          <option value="DRAFT">Brouillon</option>
          <option value="PENDING">En attente</option>
          <option value="VALIDATED">Validé</option>
          <option value="REJECTED">Rejeté</option>
          <option value="ARCHIVED">Archivé</option>
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">Toutes les catégories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="h-8 w-8 rounded-full border-[3px] border-indigo-100 border-t-indigo-600 animate-spin mx-auto" />
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 gap-3">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #a5f3fc, #0891b218)' }}>
            <FileText className="h-7 w-7" style={{ color: '#0891b2' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: '#475569' }}>Aucun document enregistré</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDocuments.map((doc) => (
            <div key={doc.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                  doc.status === 'VALIDATED' ? 'bg-green-100' :
                  doc.status === 'REJECTED' ? 'bg-red-100' :
                  doc.status === 'PENDING' ? 'bg-yellow-100' :
                  'bg-gray-100'
                }`}>
                  {doc.status === 'VALIDATED' ? <CheckCircle className="h-5 w-5 text-green-600" /> :
                   doc.status === 'REJECTED' ? <AlertCircle className="h-5 w-5 text-red-600" /> :
                   doc.status === 'PENDING' ? <Clock className="h-5 w-5 text-yellow-600" /> :
                   <FileText className="h-5 w-5 text-gray-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 truncate">{doc.title}</h4>
                  <p className="text-sm text-gray-600">{doc.category?.name || 'Sans catégorie'}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {(doc.file_size / 1024).toFixed(2)} KB • {doc.file_type?.toUpperCase()}
                  </p>
                  {doc.validated_at && (
                    <p className="text-xs text-gray-500 mt-1">
                      Validé le {new Date(doc.validated_at).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  {doc.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleValidate(doc.id)}
                        className="p-2 hover:bg-green-50 rounded-lg transition-colors"
                        title="Valider"
                      >
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </button>
                      <button
                        onClick={() => handleReject(doc.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Rejeter"
                      >
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleDownload(doc)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Télécharger"
                  >
                    <Download className="h-4 w-4 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Onglet Fichiers dossier
function FichiersTab({ files, studentId }) {
  const [showAddModal, setShowAddModal] = useState(false);

  const fileTypeLabels = {
    'INSCRIPTION': 'Inscription',
    'REINSCRIPTION': 'Réinscription',
    'PAYMENT': 'Paiement',
    'ABSENCE': 'Absence',
    'DISCIPLINE': 'Discipline',
    'ACADEMIC': 'Académique',
    'MEDICAL': 'Médical',
    'DOCUMENT': 'Document',
    'OTHER': 'Autre',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Fichiers du dossier</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Ajouter un fichier
        </button>
      </div>

      {files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 gap-3">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #fce7f3, #db277718)' }}>
            <Folder className="h-7 w-7" style={{ color: '#db2777' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: '#475569' }}>Aucun fichier dans le dossier</p>
        </div>
      ) : (
        <div className="space-y-3">
          {files.map((file) => (
            <div key={file.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <FileCheck className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{file.title}</h4>
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                        {fileTypeLabels[file.file_type] || file.file_type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{file.description}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {file.academic_year_name} • Créé le {new Date(file.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                {file.attachment && (
                  <a
                    href={file.attachment}
                    download
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Télécharger"
                  >
                    <Download className="h-4 w-4 text-gray-600" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Onglet Carte étudiant
function CarteTab({ cards, studentId, dossier }) {
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  const student = {
    name:     dossier?.user?.full_name    || '',
    matricule: dossier?.matricule         || '',
    email:    dossier?.user?.email        || '',
    phone:    dossier?.user?.phone        || '',
    photo:    dossier?.photo              || null,
    className:   dossier?.current_class?.name         || '',
    levelName:   dossier?.current_class?.level_name   || '',
    filiere:     dossier?.current_class?.program_name || '',
    siteName: dossier?.site_name || '',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Cartes étudiants</h3>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <CreditCard className="h-4 w-4" />
          Générer une carte
        </button>
      </div>

      {cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 gap-3">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #c7d2fe, #4f46e518)' }}>
            <CreditCard className="h-7 w-7" style={{ color: '#4f46e5' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: '#475569' }}>Aucune carte générée</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {cards.map((card) => (
            <div key={card.id} className="flex flex-col gap-3">
              {/* ── Physical card ── */}
              <div className="relative rounded-2xl overflow-hidden select-none"
                style={{
                  background: 'linear-gradient(135deg, #3730a3 0%, #4f46e5 45%, #7c3aed 100%)',
                  boxShadow: '0 20px 50px rgba(79,70,229,0.45)',
                  minHeight: 200,
                }}>
                {/* Decorative circles */}
                <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full opacity-10"
                  style={{ background: '#fff' }} />
                <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full opacity-10"
                  style={{ background: '#fff' }} />

                {/* Top bar */}
                <div className="flex items-center justify-between px-5 pt-4 pb-2"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60">CARTE ÉTUDIANT</p>
                    <p className="text-[10px] font-bold text-white/80 mt-0.5">{student.siteName}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                    card.is_valid ? 'bg-green-400 text-green-900' : 'bg-red-400 text-red-900'
                  }`}>
                    {card.is_valid ? 'Valide' : 'Expirée'}
                  </span>
                </div>

                {/* Card body */}
                <div className="flex gap-4 px-5 py-4">
                  {/* Photo */}
                  <div className="flex-shrink-0">
                    <div className="h-20 w-16 rounded-xl overflow-hidden flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)' }}>
                      {student.photo
                        ? <img src={student.photo} alt="" className="h-full w-full object-cover" />
                        : <User className="h-8 w-8 text-white/50" />}
                    </div>
                  </div>

                  {/* Student info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-extrabold text-white leading-tight truncate">{student.name}</p>
                    <p className="text-[11px] font-mono text-white/70 mt-0.5">{student.matricule}</p>

                    <div className="mt-2 space-y-1">
                      {student.filiere && (
                        <p className="text-[10px] font-bold text-white/80 uppercase tracking-wide truncate">{student.filiere}</p>
                      )}
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                        {student.levelName && (
                          <span className="text-[10px] text-white/65">{student.levelName}</span>
                        )}
                        {student.className && (
                          <span className="text-[10px] text-white/65">{student.className}</span>
                        )}
                      </div>
                      {student.phone && (
                        <p className="text-[10px] text-white/60">{student.phone}</p>
                      )}
                      {student.email && (
                        <p className="text-[10px] text-white/60 truncate">{student.email}</p>
                      )}
                    </div>
                  </div>

                  {/* QR code */}
                  {card.qr_code && (
                    <div className="flex-shrink-0 self-center">
                      <div className="h-16 w-16 rounded-lg overflow-hidden bg-white p-1">
                        <img src={card.qr_code} alt="QR" className="h-full w-full object-contain" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom bar */}
                <div className="flex items-center justify-between px-5 py-2.5"
                  style={{ background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-white/50">ANNÉE</p>
                    <p className="text-xs font-black text-white">{card.academic_year_name}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-mono text-white/40">{card.card_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-white/50">EXPIRE LE</p>
                    <p className="text-xs font-black text-white">
                      {new Date(card.expiry_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Meta below card */}
              <div className="flex items-center gap-3 text-xs text-gray-400 px-1">
                <span>Émise le {new Date(card.issue_date).toLocaleDateString('fr-FR')}</span>
                <span>·</span>
                <span className="font-mono">{card.card_number}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Onglet Paiements et Factures
function PaiementsTab({ studentId, studentData }) {
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    const fetchFinanceData = async () => {
      try {
        setLoading(true);
        // Fetch invoices and payments from finance service
        const invoicesData = await financeService.getInvoices({ student: studentId });
        setInvoices(invoicesData?.results || invoicesData || []);
        
        // PaymentViewSet.get_queryset only recognizes the literal `student`
        // param — `invoice__student` silently returned every payment in the
        // system instead of just this student's.
        const paymentsData = await financeService.getPayments({ student: studentId });
        setPayments(paymentsData?.results || paymentsData || []);
      } catch (error) {
        console.error('Error fetching finance data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFinanceData();
  }, [studentId]);

  // Use studentData from parent component (dossierData)
  const totalTuition = parseFloat(studentData?.tuition_fee || 0);
  const totalPaid = parseFloat(studentData?.total_paid || 0);
  const totalDue = parseFloat(studentData?.remaining_balance || 0);
  const isEnrolled = studentData?.is_enrolled || false;

  return (
    <div className="space-y-6">
      {/* Résumé financier */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Total Scolarité</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">
                {totalTuition.toLocaleString('fr-FR')} FCFA
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-200 flex items-center justify-center">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Total Payé</p>
              <p className="text-2xl font-bold text-green-900 mt-1">
                {totalPaid.toLocaleString('fr-FR')} FCFA
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-200 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-medium">En Attente</p>
              <p className="text-2xl font-bold text-orange-900 mt-1">
                {totalDue.toLocaleString('fr-FR')} FCFA
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-orange-200 flex items-center justify-center">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Reste à Payer</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">
                {totalDue.toLocaleString('fr-FR')} FCFA
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-purple-200 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Statut d'inscription */}
      {totalTuition > 0 && (
        <div className={`p-4 rounded-xl border ${
          isEnrolled
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-3">
            {isEnrolled ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <div>
              <p className={`font-medium ${
                isEnrolled ? 'text-green-900' : 'text-red-900'
              }`}>
                {isEnrolled
                  ? '✓ Étudiant inscrit'
                  : '⚠ L\'étudiant doit régler le seuil minimum de scolarité pour valider son inscription'}
              </p>
              <p className={`text-sm ${
                isEnrolled ? 'text-green-700' : 'text-red-700'
              }`}>
                Scolarité: {totalPaid.toLocaleString('fr-FR')} / {totalTuition.toLocaleString('fr-FR')} FCFA
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Liste des factures */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Factures</h3>
        {loading ? (
          <div className="text-center py-8">
            <div className="h-8 w-8 rounded-full border-[3px] border-indigo-100 border-t-indigo-600 animate-spin mx-auto" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3">
            <div className="h-14 w-14 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #bbf7d0, #05996918)' }}>
              <FileText className="h-7 w-7" style={{ color: '#059669' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: '#475569' }}>Aucune facture enregistrée</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900">{invoice.invoice_number}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        invoice.status === 'PAID' ? 'bg-green-100 text-green-700' :
                        invoice.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-700' :
                        invoice.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {invoice.status === 'PAID' ? 'Payée' :
                         invoice.status === 'PARTIAL' ? 'Partielle' :
                         invoice.status === 'OVERDUE' ? 'En retard' :
                         invoice.status === 'SENT' ? 'Envoyée' : 'Brouillon'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Date:</span>
                        <span className="ml-2 font-medium">{new Date(invoice.issue_date).toLocaleDateString('fr-FR')}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Échéance:</span>
                        <span className="ml-2 font-medium">{new Date(invoice.due_date).toLocaleDateString('fr-FR')}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Montant:</span>
                        <span className="ml-2 font-medium">{parseFloat(invoice.total).toLocaleString('fr-FR')} FCFA</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Solde:</span>
                        <span className="ml-2 font-medium text-red-600">{parseFloat(invoice.balance).toLocaleString('fr-FR')} FCFA</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedInvoice(invoice)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Voir les détails"
                  >
                    <Eye className="h-4 w-4 text-gray-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historique des paiements */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Historique des paiements</h3>
        {payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3">
            <div className="h-14 w-14 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #bbf7d0, #05996918)' }}>
              <Award className="h-7 w-7" style={{ color: '#059669' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: '#475569' }}>Aucun paiement enregistré</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => (
              <div key={payment.id} className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      payment.status === 'VALIDATED' || payment.status === 'SUCCESS' ? 'bg-green-100' :
                      payment.status === 'PENDING' ? 'bg-yellow-100' :
                      'bg-red-100'
                    }`}>
                      {payment.status === 'VALIDATED' || payment.status === 'SUCCESS' ? <CheckCircle className="h-5 w-5 text-green-600" /> :
                       payment.status === 'PENDING' ? <Clock className="h-5 w-5 text-yellow-600" /> :
                       <AlertCircle className="h-5 w-5 text-red-600" />}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{payment.payment_number || payment.id}</p>
                      <p className="text-sm text-gray-600">{payment.payment_method_name || 'N/A'}</p>
                      <p className={`text-xs ${
                        payment.status === 'VALIDATED' || payment.status === 'SUCCESS' ? 'text-green-600' :
                        payment.status === 'PENDING' ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {payment.status === 'VALIDATED' || payment.status === 'SUCCESS' ? 'Validé' :
                         payment.status === 'PENDING' ? 'En attente' :
                         payment.status === 'REJECTED' ? 'Rejeté' : payment.status}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{parseFloat(payment.amount).toLocaleString('fr-FR')} FCFA</p>
                    <p className="text-xs text-gray-500">{new Date(payment.payment_date).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Onglet Absences
function AbsencesTab({ studentId }) {
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState('all');

  useEffect(() => {
    const fetchAbsences = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/attendance-records/?student=${studentId}`);
        if (response.ok) {
          const data = await response.json();
          setAbsences(data?.results || data || []);
        }
      } catch (error) {
        console.error('Error fetching absences:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAbsences();
  }, [studentId]);

  const absentCount = absences.filter(a => a.status === 'ABSENT').length;
  const lateCount = absences.filter(a => a.status === 'LATE').length;
  const excusedCount = absences.filter(a => a.status === 'EXCUSED').length;
  const presentCount = absences.filter(a => a.status === 'PRESENT').length;
  const totalSessions = absences.length;
  const attendanceRate = totalSessions > 0 ? ((presentCount / totalSessions) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      {/* Statistiques de présence */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Taux', value: `${attendanceRate}%`, color: '#059669', bg: '#d1fae5' },
          { label: 'Présent',   value: presentCount,   color: '#059669', bg: '#d1fae5' },
          { label: 'Absent',    value: absentCount,    color: '#ef4444', bg: '#fee2e2' },
          { label: 'Retard',    value: lateCount,      color: '#d97706', bg: '#fef3c7' },
          { label: 'Excusé',    value: excusedCount,   color: '#2563eb', bg: '#dbeafe' },
        ].map((s, i) => (
          <div key={i} className="card p-4 text-center overflow-hidden relative">
            <div className="absolute -right-3 -top-3 h-12 w-12 rounded-full opacity-10 blur-lg" style={{ background: s.color }} />
            <p className="text-2xl font-extrabold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs font-semibold mt-0.5" style={{ color: '#94a3b8' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filtre par période */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-bold" style={{ color: '#475569' }}>Période:</label>
        <select value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)} className="input-field" style={{ width: 'auto' }}>
          <option value="all">Toutes les périodes</option>
          <option value="week">Cette semaine</option>
          <option value="month">Ce mois</option>
          <option value="year">Cette année</option>
        </select>
      </div>

      {/* Liste des présences */}
      <div>
        <h3 className="text-sm font-bold mb-3" style={{ color: '#0f172a' }}>Historique des présences</h3>
        {loading ? (
          <div className="text-center py-8">
            <div className="h-8 w-8 rounded-full border-[3px] border-indigo-100 border-t-indigo-600 animate-spin mx-auto" />
          </div>
        ) : absences.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="h-14 w-14 rounded-2xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, #fef3c7, #d9770618)' }}>
              <Calendar className="h-7 w-7" style={{ color: '#d97706' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: '#475569' }}>Aucun enregistrement de présence</p>
          </div>
        ) : (
          <div className="space-y-2">
            {absences.map((record) => {
              const statusCfg = {
                PRESENT: { label: 'Présent',   color: '#059669', bg: '#d1fae5', Icon: CheckCircle },
                ABSENT:  { label: 'Absent',    color: '#ef4444', bg: '#fee2e2', Icon: AlertCircle },
                LATE:    { label: 'En retard', color: '#d97706', bg: '#fef3c7', Icon: Clock },
              };
              const cfg = statusCfg[record.status] || { label: 'Excusé', color: '#2563eb', bg: '#dbeafe', Icon: CheckCircle };
              return (
              <div key={record.id} className="flex items-center gap-3 p-3.5 rounded-2xl transition-all"
                   style={{ border: '1.5px solid #f1f5f9' }}
                   onMouseEnter={e => e.currentTarget.style.borderColor=`${cfg.color}30`}
                   onMouseLeave={e => e.currentTarget.style.borderColor='#f1f5f9'}>
                <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
                     style={{ background: cfg.bg }}>
                  <cfg.Icon className="h-4.5 w-4.5" style={{ color: cfg.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold truncate" style={{ color: '#1e293b' }}>
                      {record.attendance_session?.session?.subject?.name || 'Cours'}
                    </p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: cfg.bg, color: cfg.color }}>
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: '#94a3b8' }}>
                    {record.attendance_session?.date ? new Date(record.attendance_session.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                    {record.check_in_time && ` · ${new Date(record.check_in_time).toLocaleTimeString('fr-FR')}`}
                  </p>
                </div>
              </div>
            );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Composants utilitaires
function InfoCard({ title, children, color = '#2563eb' }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${color}20` }}>
      <div className="px-4 py-2.5 flex items-center gap-2"
           style={{ background: `linear-gradient(135deg, ${color}10, ${color}05)`, borderBottom: `1px solid ${color}15` }}>
        <div className="h-1.5 w-4 rounded-full" style={{ background: color }} />
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color }}>{title}</p>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid #f8fafc' }}>
      <span className="text-xs font-semibold" style={{ color: '#94a3b8' }}>{label}</span>
      <span className="text-xs font-bold text-right max-w-[60%]" style={{ color: '#1e293b' }}>{value || '—'}</span>
    </div>
  );
}
