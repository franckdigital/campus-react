import api from './api';

// Backend uses snake_case field names; the app's WorkspaceContext uses
// camelCase — translate at the service boundary so nothing else has to care.
const toBackend = (w) => {
  const out = {};
  if (w.appName !== undefined) out.app_name = w.appName;
  if (w.appSubtitle !== undefined) out.app_subtitle = w.appSubtitle;
  if (w.primaryColor !== undefined) out.primary_color = w.primaryColor;
  if (w.fontSize !== undefined) out.font_size = w.fontSize;
  if (w.compactMode !== undefined) out.compact_mode = w.compactMode;
  if (w.language !== undefined) out.language = w.language;
  if (w.dateFormat !== undefined) out.date_format = w.dateFormat;
  if (w.itemsPerPage !== undefined) out.items_per_page = w.itemsPerPage;
  return out;
};

const fromBackend = (d) => ({
  appName: d.app_name,
  appSubtitle: d.app_subtitle,
  logoUrl: d.logo || null,
  primaryColor: d.primary_color,
  fontSize: d.font_size,
  compactMode: d.compact_mode,
  language: d.language,
  dateFormat: d.date_format,
  itemsPerPage: d.items_per_page,
});

const workspaceService = {
  get: async () => fromBackend(await api.get('/workspace-settings/')),

  /**
   * @param {object} patch - camelCase fields to update (subset of workspace shape)
   * @param {File|null|undefined} logoFile - a new logo file to upload, `null`
   *   to clear the current logo, or `undefined` to leave the logo untouched.
   */
  update: async (patch, logoFile) => {
    const payload = toBackend(patch);
    if (logoFile !== undefined) {
      const fd = new FormData();
      Object.entries(payload).forEach(([k, v]) => fd.append(k, v));
      fd.append('logo', logoFile === null ? '' : logoFile);
      return fromBackend(await api.patchUpload('/workspace-settings/', fd));
    }
    return fromBackend(await api.patch('/workspace-settings/', payload));
  },
};

export default workspaceService;
