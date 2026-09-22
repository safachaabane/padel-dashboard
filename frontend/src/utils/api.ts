import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Injecter le token JWT dans chaque requête
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('padel_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Gérer les 401 (token expiré)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('padel_token');
      localStorage.removeItem('padel_admin');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

export default api;
