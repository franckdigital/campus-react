import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { loadMatrix, MATRIX_LS } from '../utils/permissionMatrix';

// Maps user_type (from auth) → matrix role key
const USER_TYPE_TO_ROLE = {
  ADMIN:   'ADMIN',
  STAFF:   'SCOLARITE',
  TEACHER: 'ENSEIGNANT',
  STUDENT: 'ETUDIANT',
  PARENT:  'PARENT',
};

export function usePermissions() {
  const { user } = useAuth();
  // Initialize with defaults if nothing in localStorage
  const [matrix, setMatrix] = useState(() => loadMatrix());

  // Re-read matrix when admin saves it (same browser, different tab)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === MATRIX_LS) {
        setMatrix(loadMatrix());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return useMemo(() => {
    const roleKey = USER_TYPE_TO_ROLE[user?.user_type] ?? null;

    // Admin bypasses all checks
    if (!roleKey || roleKey === 'ADMIN') {
      return { can: () => true, roleKey };
    }

    const rolePerms = matrix?.[roleKey] ?? {};

    return {
      can: (permKey) => permKey == null || !!rolePerms[permKey],
      roleKey,
    };
  }, [user?.user_type, matrix]);
}
