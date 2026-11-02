import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { resetPassword } from '../services/authService';
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
          Set new password
        </div>
      </div>
    </Link>
  );
}

const MIN_LENGTH = 6;

function scorePassword(pw) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= MIN_LENGTH) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 3);
}

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [invalidToken, setInvalidToken] = useState(false);
  const [success, setSuccess] = useState(false);

  const score = useMemo(() => scorePassword(password), [password]);
  const bars = [
    score >= 1 ? 'bg-emerald-500' : 'bg-paper-200 dark:bg-white/10',
    score >= 2 ? 'bg-emerald-500' : 'bg-paper-200 dark:bg-white/10',
    score === 3 ? 'bg-emerald-500' : 'bg-paper-200 dark:bg-white/10',
  ];
  const labels = ['Weak', 'Fair', 'Strong'];

  const validate = () => {
    if (!password || password.length < MIN_LENGTH) {
      showError(`Password must be at least ${MIN_LENGTH} characters`);
      return false;
    }
    if (password !== confirmPassword) {
      showError('Passwords do not match');
      return false;
    }
    return true;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!token || !validate()) return;
    try {
      setLoading(true);
      const res = await resetPassword(token, { password, confirmPassword });
      setSuccess(true);
      showSuccess(res.message || 'Your password has been updated');
      setTimeout(() => navigate('/login', { replace: true }), 2200);
    } catch (err) {
      const code = err.code || err?.data?.code;
      if (code === 'TOKEN_INVALID_OR_EXPIRED') {
        setInvalidToken(true);
      } else {
        showError(err.message || 'Failed to reset password');
      }
    } finally {
      setLoading(false);
    }
  };

  const header = (
    <div className="mb-8">
      <BrandLink />
    </div>
  );

  if (!token || invalidToken) {
    return (
      <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {header}
          <Card>
            <CardBody className="py-8">
              <div className="flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-full bg-amber-50 dark:bg-amber-500/10 grid place-items-center text-amber-600 dark:text-amber-300">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <h1 className="mt-4 font-display text-[1.35rem] text-brand-950 dark:text-white">
                  Reset link is invalid or expired
                </h1>
                <p className="mt-2 text-sm text-brand-600/90 dark:text-paper-300 max-w-sm">
                  This password reset link may have already been used or has expired.
                  Request a new one below.
                </p>
              </div>
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Button
                  fullWidth
                  size="lg"
                  rightIcon={<KeyRound className="h-4 w-4" />}
                  onClick={() => navigate('/forgot-password', { replace: true })}
                >
                  Request new reset link
                </Button>
                <Button
                  fullWidth
                  variant="secondary"
                  onClick={() => navigate('/login', { replace: true })}
                >
                  Back to Login
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {header}
          <Card>
            <CardBody className="py-10 flex flex-col items-center text-center">
              <div className="h-14 w-14 rounded-full bg-emerald-50 dark:bg-emerald-500/10 grid place-items-center text-emerald-600 dark:text-emerald-300">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h1 className="mt-5 font-display text-[1.45rem] text-brand-950 dark:text-white">
                Password updated
              </h1>
              <p className="mt-2 text-sm text-brand-600/90 dark:text-paper-300 max-w-sm">
                Your password has been reset successfully. Redirecting you to the login page.
              </p>
              <div className="mt-6 flex items-center gap-2 text-sm text-brand-600/80 dark:text-paper-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Redirecting to Login...
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => navigate('/login', { replace: true })}
              >
                Go now
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

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
                Create a new password
              </h1>
              <p className="mt-2 text-sm text-brand-600/90 dark:text-paper-300 max-w-sm">
                Choose a strong password that you do not use elsewhere.
              </p>
            </div>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <Input
                  id="new-password"
                  label="New password"
                  type={showPw ? 'text' : 'password'}
                  required
                  minLength={MIN_LENGTH}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  rightIcon={
                    <button
                      type="button"
                      tabIndex={-1}
                      className="p-1 rounded-md hover:bg-paper-100 dark:hover:bg-white/5 text-brand-500 dark:text-paper-400"
                      onClick={() => setShowPw((v) => !v)}
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 grid grid-cols-3 gap-1.5">
                    {bars.map((cls, i) => (
                      <div key={i} className={`h-1.5 rounded-full ${cls}`} />
                    ))}
                  </div>
                  {password && (
                    <span className="text-[0.72rem] font-semibold uppercase tracking-wider text-brand-600/80 dark:text-paper-400">
                      {labels[score]}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-[0.74rem] text-brand-500/90 dark:text-paper-500">
                  Tip: add uppercase letters, numbers, or symbols for a stronger password.
                </p>
              </div>

              <Input
                id="confirm-password"
                label="Confirm new password"
                type={showConfirm ? 'text' : 'password'}
                required
                minLength={MIN_LENGTH}
                placeholder="Re-enter password"
                autoComplete="new-password"
                rightIcon={
                  <button
                    type="button"
                    tabIndex={-1}
                    className="p-1 rounded-md hover:bg-paper-100 dark:hover:bg-white/5 text-brand-500 dark:text-paper-400"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />

              {confirmPassword && password !== confirmPassword && (
                <Alert tone="warning" compact>
                  <span className="inline-flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Passwords do not match
                  </span>
                </Alert>
              )}

              <Button
                type="submit"
                fullWidth
                size="lg"
                loading={loading}
                disabled={
                  !password ||
                  !confirmPassword ||
                  password.length < MIN_LENGTH ||
                  password !== confirmPassword
                }
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Reset password
              </Button>
            </form>

            <div className="mt-7 flex items-center justify-center gap-1 text-sm text-brand-600/90 dark:text-paper-300">
              <span>Remembered it?</span>{' '}
              <Link
                to="/login"
                className="inline-flex items-center font-semibold text-brand-800 dark:text-brand-100 hover:underline underline-offset-4"
              >
                Back to Login
                <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
