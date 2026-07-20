import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, GraduationCap, AlertTriangle, CheckCircle, CreditCard, DollarSign } from 'lucide-react';
import { academicService } from '../../services/academic';
import { financeService } from '../../services/finance';
import { studentsService } from '../../services/students';
import { useApi } from '../../hooks/useApi';

const PAYMENT_METHODS = [
  { code: 'cash',          name: 'Espèces' },
  { code: 'bank_transfer', name: 'Virement bancaire' },
  { code: 'mobile_money',  name: 'Mobile Money' },
  { code: 'card',          name: 'Carte bancaire' },
  { code: 'check',         name: 'Chèque' },
];

export default function EnrollmentModal({ student, onClose, onSuccess, isReenrollment = false, editing = null }) {
  const [formData, setFormData] = useState(editing ? {
    student: student.id,
    class_obj: editing.class_obj || '',
    academic_year: editing.academic_year || '',
    status: editing.status || 'ENROLLED',
  } : {
    student: student.id,
    class_obj: '',
    academic_year: '',
    status: 'ENROLLED',
  });
  const [payment, setPayment] = useState({ amount: '', method: 'cash' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [eligibility, setEligibility] = useState({ eligible: false, loading: true, message: '' });

  const { data: classes } = useApi(() => academicService.getClasses({ is_active: true }), [], true);
  const { data: academicYears } = useApi(() => academicService.getAcademicYears?.({ is_active: true }) || Promise.resolve([]), [], true);

  const classesList = classes?.results || classes || [];
  const yearsList = academicYears?.results || academicYears || [];

  useEffect(() => {
    // Editing an existing enrollment (e.g. fixing a wrong class) isn't a new
    // registration — the eligibility/payment gate below only makes sense for
    // creating one from scratch.
    if (editing) { setEligibility({ eligible: true, loading: false, message: '' }); return; }
    const checkEligibility = async () => {
      try {
        const result = await financeService.checkEnrollmentEligibility?.(student.id).catch(() => null);
        if (result) {
          setEligibility({ eligible: result.eligible, loading: false, message: result.message, registration_fee_paid: result.registration_fee_paid, amount_due: result.amount_due });
        } else {
          const invoices = await financeService.getStudentInvoices?.(student.id).catch(() =>
            financeService.getInvoices?.({ student: student.id })
          ) || [];
          const invoicesList = invoices?.results || invoices || [];
          const registrationPaid = invoicesList.some(inv =>
            (inv.notes?.toLowerCase().includes('inscription') ||
             (inv.items || []).some(it =>
               it.description?.toLowerCase().includes('inscription') ||
               it.fee_type_name?.toLowerCase().includes('inscription')
             )) && inv.status === 'PAID'
          ) || student?.registration_fee_paid;
          setEligibility({
            eligible: registrationPaid || invoicesList.length === 0,
            loading: false,
            message: registrationPaid ? 'Frais d\'inscription payés' : 'Les frais d\'inscription doivent être payés avant l\'inscription',
            registration_fee_paid: registrationPaid,
          });
        }
      } catch {
        setEligibility({ eligible: true, loading: false, message: '' });
      }
    };
    checkEligibility();
  }, [student.id, student.registration_fee_paid]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editing) {
      setLoading(true);
      setError('');
      try {
        await academicService.updateEnrollment(editing.id, {
          class_obj: formData.class_obj,
          academic_year: formData.academic_year,
          status: formData.status,
        });
        onSuccess?.();
        onClose();
      } catch (err) {
        console.error('Error updating enrollment:', err);
        setError(err.response?.data?.detail || err.message || 'Erreur lors de la modification');
      } finally {
        setLoading(false);
      }
      return;
    }
    if (!eligibility.eligible && !isReenrollment && !parseFloat(payment.amount)) {
      setError('L\'étudiant doit payer les frais d\'inscription avant de pouvoir être inscrit.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // 1. Create enrollment
      await academicService.createEnrollment(formData);

      // 2. Record registration payment if amount provided
      const paidAmount = parseFloat(payment.amount);
      if (paidAmount > 0) {
        try {
          // Get or create REGISTRATION fee type
          let feeTypesList = [];
          try { const ft = await financeService.getFeeTypes(); feeTypesList = ft?.results || ft || []; } catch {}
          let feeType = feeTypesList.find(ft =>
            ft.code?.toLowerCase().includes('registration') ||
            ft.name?.toLowerCase().includes('inscription')
          );
          if (!feeType) {
            try {
              feeType = await financeService.createFeeType({
                name: 'Frais d\'inscription',
                code: 'REGISTRATION',
                description: 'Frais d\'inscription annuels',
                default_amount: paidAmount,
                is_recurring: false,
              });
            } catch {}
          }

          // Get academic year and site
          const academicYearId = formData.academic_year;
          const siteId = student?.site;
          const dueDate = new Date().toISOString().split('T')[0];

          if (siteId && academicYearId) {
            // Create invoice
            const invoice = await financeService.createInvoice({
              student: student.id,
              site: siteId,
              academic_year: academicYearId,
              due_date: dueDate,
              notes: 'Frais d\'inscription',
            });

            if (invoice?.id && feeType) {
              await financeService.addInvoiceItem(invoice.id, {
                fee_type: feeType.id,
                description: 'Frais d\'inscription',
                quantity: 1,
                unit_price: paidAmount,
              });
            }

            if (invoice?.id) {
              // Get or create payment method
              let methodsList = [];
              try { const pm = await financeService.getPaymentMethods(); methodsList = pm?.results || pm || []; } catch {}
              const selectedMethod = PAYMENT_METHODS.find(m => m.code === payment.method);
              let method = methodsList.find(pm =>
                pm.code?.toLowerCase() === payment.method?.toLowerCase() ||
                (selectedMethod && pm.name?.toLowerCase().includes(selectedMethod.name.toLowerCase()))
              ) || methodsList[0];
              if (!method) {
                try {
                  method = await financeService.createPaymentMethod({
                    name: selectedMethod?.name || 'Espèces',
                    code: (payment.method || 'CASH').toUpperCase(),
                    is_online: false,
                    requires_verification: false,
                  });
                } catch {}
              }
              if (method) {
                const paymentRecord = await financeService.createPayment({
                  invoice: invoice.id,
                  payment_method: method.id,
                  amount: paidAmount,
                  status: 'PENDING',
                  notes: `Frais d'inscription — ${selectedMethod?.name || 'Espèces'}`,
                });
                await financeService.validatePayment(paymentRecord.id);
              }
            }
          }

          // Also update student flags directly (belt-and-suspenders)
          await studentsService.update(student.id, {
            registration_fee_paid: true,
            registration_fee: paidAmount,
          }).catch(() => {});

        } catch (payErr) {
          console.warn('Payment recording failed but enrollment created:', payErr);
        }
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error creating enrollment:', err);
      setError(err.response?.data?.detail || err.message || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  const amountValue = parseFloat(payment.amount) || 0;
  const canSubmit = eligibility.eligible || isReenrollment || amountValue > 0;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
         style={{ background: 'rgba(8,12,36,0.58)', backdropFilter: 'blur(10px)' }}
         onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
           onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {editing ? 'Modifier l\'inscription' : isReenrollment ? 'Réinscription' : 'Nouvelle inscription'}
              </h2>
              <p className="text-sm text-gray-600">{student.user?.full_name || student.full_name} — {student.matricule}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Workflow steps + eligibility — only relevant when creating a
              brand new enrollment, not when correcting an existing one's
              classe/année/statut. */}
          {!editing && (
            <>
              <div className="rounded-xl overflow-hidden" style={{ border: '1.5px solid #e0f2fe', background: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)' }}>
                <div className="px-4 py-2.5" style={{ borderBottom: '1px solid #bae6fd' }}>
                  <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#0284c7' }}>Processus d'inscription</p>
                </div>
                <div className="px-4 py-3 flex items-start gap-3">
                  {[
                    { step: '1', label: 'Frais d\'inscription', desc: 'Obligatoire avant l\'inscription.', done: eligibility.eligible || amountValue > 0 },
                    { step: '2', label: 'Inscription en classe', desc: 'Choisir la classe et l\'année.', done: false },
                    { step: '3', label: 'Frais de scolarité', desc: 'À régler en cours d\'année.', done: false },
                  ].map((s, i) => (
                    <div key={i} className="flex-1 flex items-start gap-2 text-[10px]">
                      {i > 0 && <div className="w-3 flex-shrink-0 mt-2" style={{ borderTop: '1.5px dashed #94a3b8' }} />}
                      <div className="flex items-start gap-1.5 min-w-0">
                        <div className="h-5 w-5 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 mt-0.5"
                             style={{ background: s.done ? '#059669' : i === 1 && canSubmit ? '#2563eb' : '#cbd5e1', fontSize: '9px' }}>
                          {s.done ? '✓' : s.step}
                        </div>
                        <div>
                          <p className="font-bold leading-tight" style={{ color: s.done ? '#065f46' : '#475569' }}>{s.label}</p>
                          <p style={{ color: '#94a3b8' }}>{s.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {eligibility.loading ? (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                  <p className="text-sm text-gray-600">Vérification de l'éligibilité...</p>
                </div>
              ) : eligibility.eligible ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-green-800">Éligible à l'inscription</p>
                    <p className="text-sm text-green-600">Les frais d'inscription ont été payés intégralement.</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-amber-800">Frais d'inscription non encore enregistrés</p>
                    <p className="text-sm text-amber-600">Renseignez le montant payé ci-dessous pour les enregistrer maintenant.</p>
                  </div>
                </div>
              )}
            </>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Année académique */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Année académique *</label>
            <select required value={formData.academic_year}
              onChange={e => setFormData({ ...formData, academic_year: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">Sélectionner une année...</option>
              {yearsList.map(year => (
                <option key={year.id} value={year.id}>{year.name} {year.is_current ? '(En cours)' : ''}</option>
              ))}
            </select>
          </div>

          {/* Classe */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Classe *</label>
            <select required value={formData.class_obj}
              onChange={e => setFormData({ ...formData, class_obj: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">Sélectionner une classe...</option>
              {classesList.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.code}) — {c.level_name}</option>
              ))}
            </select>
          </div>

          {/* Statut */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Statut</label>
            <select value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="ENROLLED">Inscrit</option>
              <option value="DROPPED">Abandon</option>
              <option value="TRANSFERRED">Transféré</option>
              <option value="GRADUATED">Diplômé</option>
            </select>
          </div>

          {/* Payment section — only for creating a new enrollment */}
          {!editing && (
          <div className="rounded-xl overflow-hidden" style={{ border: '1.5px solid #d1fae5', background: '#f0fdf4' }}>
            <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom: '1px solid #bbf7d0', background: '#dcfce7' }}>
              <DollarSign className="h-4 w-4" style={{ color: '#059669' }} />
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#059669' }}>
                Frais d'inscription (optionnel)
              </p>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Montant versé (FCFA)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0 = aucun paiement"
                  value={payment.amount}
                  onChange={e => setPayment({ ...payment, amount: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              {amountValue > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Mode de paiement *
                    <CreditCard className="h-4 w-4 inline ml-1.5" style={{ color: '#059669' }} />
                  </label>
                  <select
                    required={amountValue > 0}
                    value={payment.method}
                    onChange={e => setPayment({ ...payment, method: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent">
                    {PAYMENT_METHODS.map(m => (
                      <option key={m.code} value={m.code}>{m.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {amountValue > 0 && (
                <p className="text-xs font-medium" style={{ color: '#059669' }}>
                  ✓ Une facture d'inscription de <strong>{amountValue.toLocaleString()} F</strong> sera créée et marquée comme payée.
                </p>
              )}
            </div>
          </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-200">
            <button type="button" onClick={onClose}
              className="px-6 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Annuler
            </button>
            <button type="submit"
              disabled={loading || (!editing && (eligibility.loading || !canSubmit))}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title={!editing && !canSubmit ? 'Frais d\'inscription requis ou montant à saisir' : ''}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  {editing ? 'Enregistrement...' : 'Inscription en cours...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {editing ? 'Enregistrer' : isReenrollment ? 'Réinscrire' : 'Inscrire'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
