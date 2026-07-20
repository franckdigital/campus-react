/**
 * Génère un matricule automatique pour les étudiants et enseignants
 * Format: ETU-2026-0001 ou ENS-2026-0001
 */

export const generateMatricule = (type = 'student', existingMatricules = []) => {
  const year = new Date().getFullYear();
  const prefix = type === 'student' ? 'ETU' : 'ENS';
  
  // Extraire les numéros existants pour cette année
  const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  const numbers = existingMatricules
    .map(m => {
      const match = m.match(pattern);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(n => n > 0);
  
  // Trouver le prochain numéro disponible
  const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  
  // Formater avec des zéros devant (4 chiffres)
  const formattedNumber = String(nextNumber).padStart(4, '0');
  
  return `${prefix}-${year}-${formattedNumber}`;
};

/**
 * Génère un matricule étudiant incluant le code du site.
 * Format: MAT-{CODE_SITE}-{ANNÉE}-{00001}
 */
export const generateSiteMatricule = (siteCode, existingMatricules = []) => {
  const year = new Date().getFullYear();
  const code = (siteCode || 'XX').toUpperCase();
  const prefix = `MAT-${code}-${year}-`;

  const pattern = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)$`);
  const numbers = existingMatricules
    .map(m => {
      const match = m.match(pattern);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(n => n > 0);

  const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  return `${prefix}${String(nextNumber).padStart(5, '0')}`;
};

export const validateMatricule = (matricule, type = 'student') => {
  const prefix = type === 'student' ? 'ETU' : 'ENS';
  const pattern = new RegExp(`^${prefix}-\\d{4}-\\d{4}$`);
  return pattern.test(matricule);
};

export const parseMatricule = (matricule) => {
  const parts = matricule.split('-');
  if (parts.length !== 3) return null;
  
  return {
    type: parts[0] === 'ETU' ? 'student' : 'teacher',
    year: parseInt(parts[1], 10),
    number: parseInt(parts[2], 10)
  };
};
