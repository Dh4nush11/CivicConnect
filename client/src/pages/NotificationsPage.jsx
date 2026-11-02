import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Check, Clock3 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import EmptyState from '../components/EmptyState';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notificationService';
import { timeAgo } from '../utils/format';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    try {
      setError(null);
      const response = await getNotifications();
      setNotifications(response.notifications);
    } catch (err) {
      setError(err.message || 'Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const intervalId = window.setInterval(fetchNotifications, 30000);
    return () => window.clearInterval(intervalId);
  }, [fetchNotifications]);

  const openNotification = async (notification) => {
    if (!notification.readAt) {
      try {
        await markNotificationRead(notification._id);
        setNotifications((current) => current.map((item) =>
          item._id === notification._id ? { ...item, readAt: new Date().toISOString() } : item
        ));
        window.dispatchEvent(new Event('civic-notifications-changed'));
      } catch (err) {
        showError(err.message || 'Unable to mark notification as read.');
        return;
      }
    }
    if (notification.issue) {
      const issueId = notification.issue._id || notification.issue;
      navigate(user?.role === 'citizen' ? `/issues/${issueId}` : `/admin/issues/${issueId}`);
    }
  };

  const onMarkAllRead = async () => {
    try {
      setMarkingAll(true);
      await markAllNotificationsRead();
      setNotifications((current) => current.map((item) => ({
        ...item,
        readAt: item.readAt || new Date().toISOString(),
      })));
      window.dispatchEvent(new Event('civic-notifications-changed'));
      showSuccess('All notifications marked as read.');
    } catch (err) {
      showError(err.message || 'Unable to mark notifications as read.');
    } finally {
      setMarkingAll(false);
    }
  };

  if (loading) return <Loader />;
  if (error) return <ErrorMessage message={error} onRetry={fetchNotifications} />;

  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display text-brand-900 dark:text-paper-100">Notifications</h1>
          <p className="text-sm text-paper-600 dark:text-paper-400">
            New reports and updates for your account.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={onMarkAllRead}
          disabled={!unreadCount || markingAll}
          loading={markingAll}
        >
          <Check className="mr-1.5 h-4 w-4" />
          Mark all read
        </Button>
      </header>

      {notifications.length === 0 ? (
        <EmptyState
          iconKey="inbox"
          title="You're all caught up"
          description="New report submissions and updates will appear here."
          action={<Link to="/"><Button variant="primary">Browse reports</Button></Link>}
        />
      ) : (
        <ul className="surface divide-y divide-paper-100 dark:divide-brand-800 !p-0 overflow-hidden">
          {notifications.map((notification) => (
            <li key={notification._id}>
              <button
                type="button"
                onClick={() => openNotification(notification)}
                className={`flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-paper-50 dark:hover:bg-white/[0.03] ${
                  notification.readAt ? '' : 'bg-brand-50/60 dark:bg-brand-500/[0.06]'
                }`}
              >
                <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                  notification.readAt
                    ? 'bg-paper-100 text-paper-500 dark:bg-brand-800 dark:text-paper-300'
                    : 'bg-accent-100 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300'
                }`}>
                  <Bell className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <span className="font-semibold text-brand-900 dark:text-paper-100">{notification.title}</span>
                    <span className="inline-flex items-center gap-1 text-xs text-paper-500 dark:text-paper-400">
                      <Clock3 className="h-3 w-3" />{timeAgo(notification.createdAt)}
                    </span>
                  </span>
                  <span className="mt-1 block text-sm text-paper-600 dark:text-paper-300">{notification.message}</span>
                  {notification.issue && (
                    <span className="mt-2 block text-xs font-semibold text-brand-700 dark:text-brand-200">
                      Open report
                    </span>
                  )}
                </span>
                {!notification.readAt && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent-500" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
