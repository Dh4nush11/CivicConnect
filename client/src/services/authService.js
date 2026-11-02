import api from './api';

export const register = async (payload) => {
  const { data } = await api.post('/auth/register', payload);
  return data;
};

export const login = async (payload) => {
  const { data } = await api.post('/auth/login', payload);
  return data;
};

export const getMe = async () => {
  const { data } = await api.get('/auth/me');
  return data;
};

export const sendSuspensionAppeal = async (message) => {
  const token = localStorage.getItem('cc_appeal_token');
  const { data } = await api.post('/auth/appeal', { message }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const verifyEmail = async (token) => {
  const { data } = await api.post(`/auth/verify-email/${encodeURIComponent(token)}`);
  return data;
};

export const verifyEmailOtp = async (payload) => {
  const { data } = await api.post('/auth/verify-email/otp', payload);
  return data;
};

export const resendVerification = async (payload) => {
  const { data } = await api.post('/auth/resend-verification', payload);
  return data;
};

export const forgotPassword = async (payload) => {
  const { data } = await api.post('/auth/forgot-password', payload);
  return data;
};

export const resetPassword = async (token, payload) => {
  const { data } = await api.post(
    `/auth/reset-password/${encodeURIComponent(token)}`,
    payload
  );
  return data;
};
