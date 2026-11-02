import { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendSuspensionAppeal } from '../services/authService';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Textarea } from '../components/ui/Form';

export default function AppealPage() {
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { showError } = useToast();

  const submit = async (event) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      await sendSuspensionAppeal(message);
      localStorage.removeItem('cc_appeal_token');
      setSubmitted(true);
    } catch (error) {
      showError(error.message || 'Unable to send the appeal.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-xl surface space-y-4">
      <h1 className="text-2xl font-bold font-display text-brand-900 dark:text-paper-100">Account appeal</h1>
      {submitted ? (
        <p className="text-paper-700 dark:text-paper-300">Your appeal has been sent to the administrators.</p>
      ) : (
        <>
          <p className="text-sm text-paper-600 dark:text-paper-400">
            Your account is suspended. Explain why you believe this decision should be reviewed.
          </p>
          <form onSubmit={submit} className="space-y-4">
            <Textarea
              label="Appeal message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={6}
              maxLength={2000}
              required
            />
            <Button type="submit" disabled={!message.trim() || submitting} loading={submitting}>
              Send appeal
            </Button>
          </form>
        </>
      )}
      <Link to="/login" className="block text-sm text-brand-700 dark:text-brand-200">Back to login</Link>
    </main>
  );
}
