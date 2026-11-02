import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Building2,
  MapPin,
  ThumbsUp,
  Shield,
  ShieldCheck,
  ArrowRight,
  ChevronRight,
  RefreshCw,
  Mail,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { resendVerification } from '../services/authService';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Form';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';

function BrandPanel() {
  const features = [
    { icon: MapPin, title: 'Precise location reporting', desc: 'Drop a pin on the exact spot with GPS accuracy' },
    { icon: ThumbsUp, title: 'Community upvoting', desc: 'Prioritize the issues that matter most to neighbors' },
    { icon: Shield, title: 'Transparent timeline', desc: 'Track each status update from report to resolution' },
  ];
  return (
    <div className="relative hidden md:flex md:w-[44%] lg:w-[48%] bg-brand-900 text-white overflow-hidden">
      <div className="absolute inset-0 opacity-[0.07]" style={{
        backgroundImage:
          'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.9) 0, rgba(255,255,255,0) 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.8) 0, rgba(255,255,255,0) 45%)',
      }} />
      <div className="relative z-10 w-full p-10 lg:p-14 flex flex-col">
        <Link to="/" className="inline-flex items-center gap-2.5 mb-14 group">
          <div className="h-10 w-10 rounded-lg grid place-items-center bg-brand-100 text-brand-900 shadow-sm">
            <Building2 className="h-5.5 w-5.5" strokeWidth={2.2} />
          </div>
          <div className="leading-tight">
            <div className="font-display tracking-tightest font-bold text-[1.1rem]">CivicConnect</div>
            <div className="text-[0.7rem] uppercase tracking-widest text-brand-200/80 font-semibold">Civic Issue Platform</div>
          </div>
        </Link>

        <div className="flex-1 flex flex-col justify-center">
          <Badge
            tone="bg-brand-700/70 text-brand-100 border border-brand-600/60"
            size="sm"
            className="self-start mb-5"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Built for citizens & cities
          </Badge>
          <h2 className="font-display tracking-tightest text-[2rem] lg:text-[2.3rem] leading-[1.08] mb-5">
            Every report moves your city forward.
          </h2>
          <p className="text-brand-200/90 leading-relaxed text-[0.95rem] max-w-md mb-10">
            Citizens report, authorities act. With location-tagged evidence and public status trails,
            civic participation becomes measurable, visible, and effective.
          </p>

          <ul className="space-y-4.5 max-w-md">
            {features.map(({ icon: Icon, title, desc }) => (
              <li key={title} className="flex items-start gap-3.5">
                <span className="shrink-0 mt-0.5 h-9 w-9 grid place-items-center rounded-md-plus bg-white/5 border border-white/10 text-brand-100">
                  <Icon className="h-4.5 w-4.5" strokeWidth={2} />
                </span>
                <span>
                  <span className="block font-semibold text-[0.92rem] text-white">{title}</span>
                  <span className="block text-[0.82rem] text-brand-200/85 leading-relaxed">{desc}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="pt-10 text-[0.76rem] text-brand-200/70 tabular">
          OpenStreetMap · MERN stack · Built with purpose
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [verificationError, setVerificationError] = useState(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const { login, user, isAuthenticated } = useAuth();
  const { showError, showSuccess, showInfo } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname;
  const sessionExpired = location.search?.includes('session_expired');

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const destination = from || (user?.role === 'admin' || user?.role === 'officer' ? '/admin' : '/dashboard');
    navigate(destination, { replace: true });
  }, [from, isAuthenticated, navigate, user?.role]);

  const validate = () => {
    const e = {};
    if (!form.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setVerificationError(null);
    try {
      setLoading(true);
      const res = await login(form);
      showSuccess(res.message || 'Welcome back!');
      const destination = from || (
        res.data.user.role === 'admin' || res.data.user.role === 'officer' ? '/admin' : '/dashboard'
      );
      navigate(destination, { replace: true });
    } catch (err) {
      if (err && err.code === 'EMAIL_NOT_VERIFIED') {
        setVerificationError(err.data?.email || form.email);
        return;
      }
      if (err?.code === 'ACCOUNT_SUSPENDED' && err.data?.data?.appealToken) {
        localStorage.setItem('cc_appeal_token', err.data.data.appealToken);
        navigate('/appeal', { replace: true });
        return;
      }
      if (err && err.response && err.response.data && err.response.data.code === 'EMAIL_NOT_VERIFIED') {
        setVerificationError(err.response.data.data?.email || form.email);
        return;
      }
      showError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (cooldown > 0 || !verificationError) return;
    try {
      setResendLoading(true);
      const email = verificationError || form.email;
      const res = await resendVerification({ email });
      showInfo(res.message);
      setCooldown(60);
    } catch (err) {
      showError(err.message || 'Could not resend verification');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-12rem)] -mx-4 sm:-mx-6 lg:-mx-8 mt-[-24px] sm:mt-[-32px] mb-[-24px] sm:mb-[-32px] flex bg-white dark:bg-brand-950 animate-fade-in">
      <BrandPanel />

      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-14">
        <div className="w-full max-w-md">
          <div className="md:hidden flex items-center gap-2 mb-8">
            <div className="h-9 w-9 rounded-md grid place-items-center bg-brand-900 text-white dark:bg-brand-100 dark:text-brand-900">
              <Building2 className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <span className="font-display tracking-tightest font-bold text-brand-950 dark:text-white">CivicConnect</span>
          </div>

          <div className="mb-7">
            <h1 className="font-display tracking-tightest text-[1.75rem] leading-tight text-brand-950 dark:text-white mb-1.5">
              Welcome back
            </h1>
            <p className="text-[0.9rem] text-brand-700/80 dark:text-paper-300 leading-relaxed">
              Login to your CivicConnect account to track reports, upvote issues, or manage the queue.
            </p>
          </div>

          {sessionExpired && (
            <div className="mb-5">
              <Alert tone="warning" title="Session expired">
                Please login again to continue.
              </Alert>
            </div>
          )}

          {verificationError && (
            <div className="mb-5">
              <Alert
                tone="warning"
                title="Verify your email first"
                icon={<Mail className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
              >
                <p className="mb-2.5">
                  The account <span className="font-medium">{verificationError}</span> has not been
                  verified yet. Check your inbox for the 6-digit code we sent during
                  registration, or request a new one below.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  loading={resendLoading}
                  disabled={cooldown > 0}
                  leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${cooldown > 0 ? 'opacity-70' : ''}`} />}
                  onClick={onResend}
                >
                  {cooldown > 0
                    ? `Resend available in ${cooldown}s`
                    : 'Resend verification code'}
                </Button>
              </Alert>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              id="login-email"
              label="Email"
              type="email"
              required
              placeholder="you@example.com"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              error={errors.email}
            />
            <Input
              id="login-password"
              label="Password"
              type="password"
              required
              placeholder="••••••••"
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              error={errors.password}
            />
            <div className="flex items-center justify-end -mt-2">
              <Link
                to="/forgot-password"
                className="text-[0.82rem] font-semibold text-brand-700 dark:text-brand-100 hover:underline underline-offset-4"
              >
                Forgot password?
              </Link>
            </div>
            <Button
              type="submit"
              size="lg"
              fullWidth
              loading={loading}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Login
            </Button>
          </form>

          <p className="text-center text-[0.86rem] text-brand-700/85 dark:text-paper-300 mt-7">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-semibold text-brand-800 dark:text-brand-100 hover:underline underline-offset-4"
            >
              <span className="inline-flex items-center">
                Create one
                <ChevronRight className="h-3.5 w-3.5 ml-0.5 -mr-1" />
              </span>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
