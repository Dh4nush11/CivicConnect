import api from './api';

export const updateIssueStatus = async (id, payload, uploadToken) => {
  const { data } = await api.put(`/admin/issues/${id}/status`, payload, {
    ...(payload instanceof FormData ? {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(uploadToken ? { 'X-Upload-Token': uploadToken } : {}),
      },
    } : {}),
  });
  return data;
};

export const reviewSpam = async (id, payload) => {
  const { data } = await api.put(`/admin/issues/${id}/spam`, payload);
  return data;
};

export const assignIssue = async (id, userId) => {
  const { data } = await api.put(`/admin/issues/${id}/assign`, { userId });
  return data;
};

export const flagDuplicate = async (id, payload) => {
  const { data } = await api.put(`/admin/issues/${id}/duplicate`, payload);
  return data;
};

export const getAnalytics = async () => {
  const { data } = await api.get('/admin/analytics');
  return data;
};

export const getAuthorityUsers = async () => {
  const { data } = await api.get('/admin/users/authority');
  return data;
};

export const getAdminUsers = async (params = {}) => {
  const { data } = await api.get('/admin/users', { params });
  return data;
};

export const createManagedUser = async (user) => {
  const { data } = await api.post('/admin/users', user);
  return data;
};

export const deleteManagedAccount = async (id, reason) => {
  const { data } = await api.delete(`/admin/users/${id}`, { data: { reason } });
  return data;
};

export const approveManagedUser = async (id, reason = '') => {
  const { data } = await api.put(`/admin/users/${id}/approve`, { reason });
  return data;
};

export const changeManagedUserRole = async (id, role, reason) => {
  const { data } = await api.put(`/admin/users/${id}/role`, { role, reason });
  return data;
};

export const setManagedUserSuspension = async (id, suspended, reason) => {
  const { data } = await api.put(`/admin/users/${id}/suspension`, { suspended, reason });
  return data;
};

export const getAuditLog = async () => {
  const { data } = await api.get('/admin/audit-log');
  return data;
};

export const getSpamQueue = async () => {
  const { data } = await api.get('/admin/issues/spam-queue');
  return data;
};
