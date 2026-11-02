import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  MailCheck,
  RefreshCw,
  AlertTriangle,
  Building2,
} from 'lucide-react';
import { verifyEmail, resendVerification } from '../services/authService';
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
          Email verification
        </div>
      </div>
    </Link>
  );
}

export default function VerifyEmailPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError, showInfo } = useToast();

  const [state, setState] = useState('loading');
  const [errorCode, setErrorCode] = useState(null);
  const [hintEmail, setHintEmail] = useState('');
  const [resendForm, setResendForm] = useState({ email: '' });
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!token) {
      setState('error');
      setErrorCode('NO_TOKEN');
      return;
    }
    let active = true;
    (async () => {
      try {
        const res = await verifyEmail(token);
        if (!active) return;
        if (res.success) {
          setState('success');
          showSuccess(res.message || 'Email verified successfully');
        }
      } catch (err) {
        if (!active) return;
        setState('error');
        setErrorCode(err.code || err.response?.data?.code || 'TOKEN_INVALID_OR_EXPIRED');
      }
    })();
    return () => {
      active = false;
    };
  }, [token, showSuccess]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const onResend = async (e) => {
    e.preventDefault();
    if (!resendForm.email || cooldown > 0) return;
    try {
      setResendLoading(true);
      const res = await resendVerification({ email: resendForm.email });
      setHintEmail(resendForm.email);
      setState('sent');
      setCooldown(60);
      showInfo(res.message);
    } catch (err) {
      showError(err.message || 'Failed to resend verification');
    } finally {
      setResendLoading(false);
    }
  };

  const header = (
    <div className="mb-8">
      <BrandLink />
    </div>
  );

  if (state === 'loading') {
    return (
      <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {header}
          <Card>
            <CardBody className="py-10 flex flex-col items-center text-center">
              <Loader2 className="h-10 w-10 text-brand-600 dark:text-brand-300 animate-spin" />
              <h1 className="mt-4 font-display text-[1.4rem] text-brand-950 dark:text-white">
                Verifying your email...
              </h1>
              <p className="mt-1.5 text-sm text-brand-600/90 dark:text-paper-300">
                Please wait a moment while we confirm your email address.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  if (state === 'success') {
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
                Email verified
              </h1>
              <p className="mt-2 text-sm text-brand-600/90 dark:text-paper-300 max-w-sm">
                Your email address has been confirmed. You can now login to your CivicConnect account
                and start reporting civic issues.
              </p>
              <Button
                size="lg"
                className="mt-7 w-full max-w-xs"
                rightIcon={<ArrowRight className="h-4 w-4" />}
                onClick={() => navigate('/login', { replace: true })}
              >
                Go to Login
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  const showResend = state === 'sent';

  return (
    <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {header}
        <Card>
          <CardBody className="py-8">
            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-amber-50 dark:bg-amber-500/10 grid place-items-center text-amber-600 dark:text-amber-300">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h1 className="mt-4 font-display text-[1.35rem] text-brand-950 dark:text-white">
                Verification link {errorCode === 'NO_TOKEN' ? 'missing' : 'invalid or expired'}
              </h1>
              <p className="mt-2 text-sm text-brand-600/90 dark:text-paper-300 max-w-sm">
                {errorCode === 'NO_TOKEN'
                  ? 'No verification token was provided. Enter your email below to request a new 6-digit verification code.'
                  : 'This link may have expired or have already been used. Enter your email below and we will send you a fresh 6-digit code.'}
              </p>
            </div>

            {showResend && (
              <div className="mt-6">
                <Alert tone="success" title="Check your inbox">
                  If an account exists for{' '}
                  <span className="font-medium">{hintEmail || 'the email you entered'}</span>, a new
                  verification code has been sent.
                </Alert>
              </div>
            )}

            <form onSubmit={onResend} className="mt-6 space-y-4">
              <Input
                id="resend-email"
                label="Email address"
                type="email"
                required
                placeholder="you@example.com"
                autoComplete="email"
                value={resendForm.email}
                onChange={(e) => setResendForm({ ...resendForm, email: e.target.value })}
              />
              <Button
                type="submit"
                fullWidth
                size="lg"
                loading={resendLoading}
                disabled={cooldown > 0}
                leftIcon={<RefreshCw className={`h-4 w-4 ${cooldown > 0 ? 'opacity-70' : ''}`} />}
              >
                {cooldown > 0
                  ? `Resend available in ${cooldown}s`
                  : 'Resend verification code'}
              </Button>
            </form>

            <div className="mt-6 flex items-center justify-center gap-1 text-sm text-brand-600/90 dark:text-paper-300">
              <MailCheck className="h-4 w-4 opacity-80" />
              Already verified?{' '}
              <Link
                to="/login"
                className="inline-flex items-center font-semibold text-brand-800 dark:text-brand-100 hover:underline underline-offset-4"
              >
                Login instead
                <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
