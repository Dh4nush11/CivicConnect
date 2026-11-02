import api from './api';

export const getIssues = async (params = {}) => {
  const { data } = await api.get('/issues', { params });
  return data;
};

export const getIssueById = async (id) => {
  const { data } = await api.get(`/issues/${id}`);
  return data;
};

export const getIssueUploadToken = async () => {
  const { data } = await api.post('/issues/upload-token');
  return data.data;
};

export const createIssue = async (formData, uploadToken) => {
  const { data } = await api.post('/issues', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      'X-Upload-Token': uploadToken,
    },
  });
  return data;
};

export const updateIssue = async (id, formData, uploadToken) => {
  const { data } = await api.put(`/issues/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      ...(uploadToken ? { 'X-Upload-Token': uploadToken } : {}),
    },
  });
  return data;
};

export const deleteIssue = async (id) => {
  const { data } = await api.delete(`/issues/${id}`);
  return data;
};

export const reopenIssue = async (id, reason = '') => {
  const { data } = await api.post(`/issues/${id}/reopen`, { reason });
  return data;
};

export const upvoteIssue = async (id) => {
  const { data } = await api.put(`/issues/${id}/upvote`);
  return data;
};

export const addComment = async (id, text) => {
  const { data } = await api.post(`/issues/${id}/comments`, { text });
  return data;
};

export const getMyIssues = async (params = {}) => {
  const { data } = await api.get('/issues/mine', { params });
  return data;
};

export const getNearbyDuplicates = async (params) => {
  const { data } = await api.get('/issues/duplicates', { params });
  return data;
};
