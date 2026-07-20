import { useState, useEffect, useCallback } from 'react';
import { studentsService } from '../services/students';
import { useAuth } from '../context/AuthContext';

// A student whose registration fee is unpaid is blocked from most of the
// app (backend-enforced by apps.students.permissions.IsRegistrationFeePaidOrExempt) —
// this hook exposes the same flag so the frontend can show a friendly
// "pay to continue" screen instead of raw 403s.
export function useRegistrationFeeGate() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [registrationFeePaid, setRegistrationFeePaid] = useState(true);
  // Échéancier de scolarité (payment installment schedule) — only relevant
  // to gate e-learning resources for ELEARNING-modality students, see FeeGate.
  const [modality, setModality] = useState(null);
  const [tuitionUpToDate, setTuitionUpToDate] = useState(true);
  const [echeanceOverride, setEcheanceOverride] = useState(false);

  const check = useCallback(async () => {
    if (!user || user.user_type !== 'STUDENT') {
      setRegistrationFeePaid(true);
      setTuitionUpToDate(true);
      setLoading(false);
      return;
    }
    try {
      const student = await studentsService.getMe();
      setRegistrationFeePaid(!!student?.registration_fee_paid);
      setModality(student?.modality || null);
      setTuitionUpToDate(student?.tuition_up_to_date ?? true);
      setEcheanceOverride(!!student?.echeance_override);
    } catch {
      // Fail open — don't lock a student out of the whole app just because
      // this one lookup failed; the backend still enforces the real gate.
      setRegistrationFeePaid(true);
      setTuitionUpToDate(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { check(); }, [check]);

  return {
    loading, registrationFeePaid, recheck: check,
    modality, tuitionUpToDate, echeanceOverride,
  };
}

export default useRegistrationFeeGate;
