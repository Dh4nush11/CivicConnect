import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  KeyRound,
  MailCheck,
  Send,
} from 'lucide-react';
import { forgotPassword } from '../services/authService';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Form';
import { Alert } from '../components/ui/Alert';
import { Card, CardBody } from '../components/ui/Card';

function BrandLink() {
  return (
    <Link to="/" className="inline-flex items-center gap-2.5 group">
      <div className="h-10 w-10 rounded-lg grid place-items-center bg-brand-900 text-white dark:bg-brand-100 dark:text-brand-900 shadow-sm">
        <Building2 className="h-5.5 w-5.5" strokeWidth={2.2} />
      </div>
      <div className="leading-tight">
        <div className="font-display tracking-tightest font-bold text-[1.05rem] text-brand-900 dark:text-white">
          CivicConnect
        </div>
        <div className="text-[0.68rem] uppercase tracking-widest text-brand-500/80 font-semibold">
          Password recovery
        </div>
      </div>
    </Link>
  );
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { showError, showInfo } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    try {
      setLoading(true);
      const res = await forgotPassword({ email });
      setSent(true);
      showInfo(res.message);
    } catch (err) {
      showError(err.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  const header = (
    <div className="mb-8">
      <BrandLink />
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {header}
        <Card>
          <CardBody className="py-8">
            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-brand-50 dark:bg-brand-500/10 grid place-items-center text-brand-600 dark:text-brand-300">
                <KeyRound className="h-6 w-6" />
              </div>
              <h1 className="mt-4 font-display text-[1.35rem] text-brand-950 dark:text-white">
                Forgot your password?
              </h1>
              <p className="mt-2 text-sm text-brand-600/90 dark:text-paper-300 max-w-sm">
                {sent
                  ? 'If an account exists with that email, a reset link has been sent. Check your inbox to continue.'
                  : 'Enter the email associated with your account and we will send you a secure link to reset your password.'}
              </p>
            </div>

            {sent && (
              <div className="mt-6">
                <Alert tone="success" title="Reset link sent">
                  If a CivicConnect account exists for{' '}
                  <span className="font-medium">{email}</span>, a password reset link
                  has been sent. The link will expire in 20 minutes.
                </Alert>
                <div className="mt-5 flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => navigate('/login', { replace: true })}
                  >
                    Back to Login
                  </Button>
                  <Button
                    fullWidth
                    onClick={() => setSent(false)}
                    leftIcon={<KeyRound className="h-4 w-4" />}
                  >
                    Try another email
                  </Button>
                </div>
              </div>
            )}

            {!sent && (
              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <Input
                  id="forgot-email"
                  label="Email address"
                  type="email"
                  required
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  loading={loading}
                  leftIcon={<Send className="h-4 w-4" />}
                >
                  Send reset link
                </Button>
              </form>
            )}

            <div className="mt-7 flex items-center justify-center gap-1 text-sm text-brand-600/90 dark:text-paper-300">
              <MailCheck className="h-4 w-4 opacity-80" />
              Remembered your password?{' '}
              <Link
                to="/login"
                className="inline-flex items-center font-semibold text-brand-800 dark:text-brand-100 hover:underline underline-offset-4"
              >
                Go to Login
                <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
