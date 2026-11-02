import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('cc_token');
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      if (error.response.data?.code === 'ACCOUNT_SUSPENDED' &&
          error.response.data?.data?.appealToken) {
        localStorage.setItem('cc_appeal_token', error.response.data.data.appealToken);
        if (!window.location.pathname.startsWith('/appeal')) {
          window.location.href = '/appeal';
        }
      }
      if (error.response.status === 401) {
        const skip =
          error.response.data &&
          (error.response.data.code === 'PASSWORD_CHANGED');
        if (!skip) {
          localStorage.removeItem('cc_token');
          localStorage.removeItem('cc_user');
          if (!window.location.pathname.startsWith('/login')) {
            window.location.href = '/login?session_expired=1';
          }
        }
      }
      const payload = {
        message:
          error.response.data?.message ||
          error.response.statusText ||
          'Something went wrong',
        status: error.response.status,
        data: error.response.data,
      };
      if (error.response.data && error.response.data.code) {
        payload.code = error.response.data.code;
      }
      return Promise.reject(payload);
    } else if (error.request) {
      return Promise.reject({
        message: 'Network error. Please check your internet connection.',
        status: 0,
      });
    }
    return Promise.reject(error);
  }
);

export default api;
