import API_BASE_URL from '../config/api';

// Recursively flattens a DRF validation-error payload (arbitrarily nested —
// e.g. a serializer with a nested sub-serializer like user_data) into
// "field.subfield: message" strings, instead of naively stringifying a
// nested object into "[object Object]".
function flattenValidationErrors(data, prefix = '') {
  const lines = [];
  for (const [field, value] of Object.entries(data)) {
    const path = prefix ? `${prefix}.${field}` : field;
    if (Array.isArray(value)) {
      lines.push(`${path}: ${value.join(', ')}`);
    } else if (value && typeof value === 'object') {
      lines.push(...flattenValidationErrors(value, path));
    } else {
      lines.push(`${path}: ${value}`);
    }
  }
  return lines;
}

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this._refreshPromise = null; // shared promise so concurrent 401s share one refresh
  }

  // Returns the same promise if a refresh is already in flight
  _doRefresh() {
    if (!this._refreshPromise) {
      this._refreshPromise = this.refreshToken().finally(() => {
        this._refreshPromise = null;
      });
    }
    return this._refreshPromise;
  }

  getToken() {
    return localStorage.getItem('access_token');
  }

  setTokens(access, refresh) {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
  }

  clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  async request(endpoint, options = {}) {
    const token = this.getToken();
    
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, config);
      
      if (response.status === 401) {
        const refreshed = await this._doRefresh();
        if (refreshed) {
          config.headers.Authorization = `Bearer ${this.getToken()}`;
          const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, config);
          return this.handleResponse(retryResponse);
        } else {
          throw new Error('Session expirée. Veuillez vous reconnecter.');
        }
      }

      return this.handleResponse(response);
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  async handleResponse(response) {
    const data = await response.json().catch(() => null);
    
    if (!response.ok) {
      // Extraire le message d'erreur du backend
      let error = 'Une erreur est survenue';
      if (data) {
        if (data.detail) {
          error = data.detail;
        } else if (data.message) {
          error = data.message;
        } else if (typeof data === 'object') {
          // Gérer les erreurs de validation Django, y compris imbriquées
          // (ex: {"user_data": {"email": ["..."]}} pour un serializer avec
          // un sous-serializer user_data) — un simple `${msgs}` sur un objet
          // imbriqué se réduit silencieusement à "[object Object]".
          const errors = flattenValidationErrors(data).join('; ');
          if (errors) error = errors;
        }
      }
      throw new Error(error);
    }
    
    return data;
  }

  async refreshToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        this.setTokens(data.access, data.refresh || refreshToken);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  // HTTP Methods
  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  patch(endpoint, data) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  async upload(endpoint, formData) {
    const token = this.getToken();
    const config = {
      method: 'POST',
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
      body: formData,
    };
    let response = await fetch(`${this.baseUrl}${endpoint}`, config);
    if (response.status === 401) {
      const refreshed = await this._doRefresh();
      if (refreshed) {
        config.headers.Authorization = `Bearer ${this.getToken()}`;
        response = await fetch(`${this.baseUrl}${endpoint}`, config);
      } else {
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }
    }
    return this.handleResponse(response);
  }

  async patchUpload(endpoint, formData) {
    const token = this.getToken();
    const config = {
      method: 'PATCH',
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
      body: formData,
    };
    let response = await fetch(`${this.baseUrl}${endpoint}`, config);
    if (response.status === 401) {
      const refreshed = await this._doRefresh();
      if (refreshed) {
        config.headers.Authorization = `Bearer ${this.getToken()}`;
        response = await fetch(`${this.baseUrl}${endpoint}`, config);
      } else {
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }
    }
    return this.handleResponse(response);
  }

  async getBlob(endpoint) {
    const makeReq = (token) =>
      fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: { ...(token && { Authorization: `Bearer ${token}` }) },
      });

    let response = await makeReq(this.getToken());

    if (response.status === 401) {
      const refreshed = await this._doRefresh();
      if (refreshed) {
        response = await makeReq(this.getToken());
      }
    }

    if (!response.ok) throw new Error(`Erreur ${response.status}`);
    return response.blob();
  }

  // Auth methods
  async login(email, password) {
    const response = await fetch(`${this.baseUrl}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail || 'Identifiants incorrects');
    }

    this.setTokens(data.access, data.refresh);
    return data;
  }

  async logout() {
    try {
      await this.post('/auth/logout/', {
        refresh: localStorage.getItem('refresh_token'),
      });
    } finally {
      this.clearTokens();
    }
  }

  async getProfile() {
    return this.get('/auth/profile/');
  }
}

export const api = new ApiService();
export default api;
