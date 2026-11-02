import api from './api';

export const getNotifications = async () => {
  const { data } = await api.get('/notifications');
  return data.data;
};

export const getUnreadNotificationCount = async () => {
  const { data } = await api.get('/notifications/unread-count');
  return data.data.unreadCount;
};

export const markNotificationRead = async (id) => {
  const { data } = await api.put(`/notifications/${id}/read`);
  return data;
};

export const markAllNotificationsRead = async () => {
  const { data } = await api.put('/notifications/read-all');
  return data;
};
