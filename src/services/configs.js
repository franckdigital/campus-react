import api from './api';

// Thin wrapper around apps.core's generic SystemConfig key/value store
// (GET/POST/PATCH /configs/, GET /configs/public/ — AllowAny) — used for
// small admin-configured settings that don't warrant their own model/field,
// e.g. the institution's Mobile Money receiving number.
const configService = {
  list: (params = {}) => {
    // page_size=200 so a plain list() can't silently miss a config on page 2
    // — the backend doesn't filter by `key` server-side, so setValue/findByKey
    // below fetch everything and filter client-side.
    const qs = new URLSearchParams(
      Object.entries({ page_size: 200, ...params }).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    return api.get(`/configs/${qs ? `?${qs}` : ''}`);
  },
  getPublic: () => api.get('/configs/public/'),

  findByKey: async (key) => {
    const res = await api.get(`/configs/?page_size=200`);
    const rows = res?.results ?? (Array.isArray(res) ? res : []);
    return rows.find(r => r.key === key) || null;
  },

  // Create-or-update a single key so callers don't need to know whether a
  // row already exists for it.
  setValue: async (key, value, { isPublic = true } = {}) => {
    const existing = await configService.findByKey(key);
    if (existing) {
      return api.patch(`/configs/${existing.id}/`, { value: String(value) });
    }
    // `site` must be sent explicitly even though the model allows it to be
    // null — SystemConfig has unique_together = ['key', 'site'], and DRF's
    // UniqueTogetherValidator requires every field in that constraint to be
    // present in the payload (even nullable ones) or it 400s with "This
    // field is required", regardless of the model's own null=True.
    return api.post('/configs/', { key, value: String(value), is_public: isPublic, site: null });
  },

  deleteValue: async (key) => {
    const existing = await configService.findByKey(key);
    if (existing) return api.delete(`/configs/${existing.id}/`);
    return null;
  },
};

export default configService;
