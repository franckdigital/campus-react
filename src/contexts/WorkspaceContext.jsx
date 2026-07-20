import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import workspaceService from '../services/workspace';

const STORAGE_KEY = 'campus_workspace';

const DEFAULTS = {
  appName: 'CampusLMS',
  appSubtitle: 'Plateforme de gestion académique',
  logoUrl: null,
  primaryColor: '#6366f1',
  fontSize: 14,          // numeric px value (8–32)
  compactMode: false,
  language: 'fr',
  dateFormat: 'DD/MM/YYYY',
  itemsPerPage: 10,
};

const PRESET_THEMES = [
  { name: 'Indigo',        color: '#6366f1' },
  { name: 'Bleu',          color: '#2563eb' },
  { name: 'Violet',        color: '#7c3aed' },
  { name: 'Émeraude',      color: '#059669' },
  { name: 'Ambre',         color: '#d97706' },
  { name: 'Rose',          color: '#db2777' },
  { name: 'Rouge',         color: '#dc2626' },
  { name: 'Ardoise',       color: '#475569' },
];

const WorkspaceContext = createContext(null);

export const useWorkspace = () => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
};

const applyColor = (color) => {
  const root = document.documentElement;
  root.style.setProperty('--primary', color);
  root.style.setProperty('--sidebar-active', color);
  // Derive a lighter version for backgrounds (add 90% opacity)
  root.style.setProperty('--primary-light', color + '18');
  root.style.setProperty('--sidebar-active-glow', color + '40');
  root.style.setProperty('--shadow-colored', `0 8px 28px ${color}45`);
};

const applyFontSize = (size) => {
  const root = document.documentElement;
  if (typeof size === 'number') {
    root.style.fontSize = `${size}px`;
  } else {
    // backward compat with old string values
    const map = { compact: '13px', normal: '14px', large: '16px' };
    root.style.fontSize = map[size] || '14px';
  }
};

const applyCompact = (compact) => {
  document.documentElement.classList.toggle('compact-mode', compact);
};

export const WorkspaceProvider = ({ children }) => {
  // localStorage is just an instant-render cache so the UI doesn't flash
  // defaults before the backend responds — the backend is the source of truth,
  // shared across every user/device once loaded.
  const [workspace, setWorkspace] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : DEFAULTS;
    } catch { return DEFAULTS; }
  });

  // Apply cached values immediately, then fetch the real shared config.
  useEffect(() => {
    applyColor(workspace.primaryColor);
    applyFontSize(workspace.fontSize);
    applyCompact(workspace.compactMode);

    workspaceService.get().then(remote => {
      setWorkspace(prev => {
        const next = { ...prev, ...remote };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        applyColor(next.primaryColor);
        applyFontSize(next.fontSize);
        applyCompact(next.compactMode);
        return next;
      });
    }).catch(() => {}); // offline/first-run: keep the local cache/defaults
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * @param {object} patch - camelCase workspace fields to update
   * @param {File|null} [logoFile] - pass a File to upload a new logo, or
   *   `null` to clear it. Omit entirely to leave the logo untouched.
   */
  const updateWorkspace = useCallback(async (patch, logoFile) => {
    const saved = await workspaceService.update(patch, logoFile);
    setWorkspace(prev => {
      const next = { ...prev, ...saved };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    applyColor(saved.primaryColor);
    applyFontSize(saved.fontSize);
    applyCompact(saved.compactMode);
    return saved;
  }, []);

  const resetWorkspace = useCallback(async () => {
    const saved = await workspaceService.update(DEFAULTS, null);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    setWorkspace(saved);
    applyColor(saved.primaryColor);
    applyFontSize(saved.fontSize);
    applyCompact(saved.compactMode);
    return saved;
  }, []);

  return (
    <WorkspaceContext.Provider value={{ workspace, updateWorkspace, resetWorkspace, PRESET_THEMES }}>
      {children}
    </WorkspaceContext.Provider>
  );
};
