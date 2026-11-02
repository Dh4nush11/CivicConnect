import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  User,
  ArrowRight,
  ChevronRight,
  MailCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { resendVerification, verifyEmailOtp } from '../services/authService';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Form';
import { SegmentedControl } from '../components/ui/Misc';
import { Alert } from '../components/ui/Alert';
import { Card, CardBody } from '../components/ui/Card';

const ROLE_OPTIONS = [
  { value: 'citizen', label: 'Citizen', icon: User },
];

function BrandPanel() {
  const pillars = [
    { n: '01', title: 'Evidence based', desc: 'Upload photos & drop pins on the map for every report' },
    { n: '02', title: 'Public timeline', desc: 'Every status change is visible and accountable' },
    { n: '03', title: 'Community signal', desc: 'Upvotes help authorities triage with real demand' },
  ];
  return (
    <div className="relative hidden md:flex md:w-[44%] lg:w-[48%] bg-brand-900 text-white overflow-hidden">
      <div className="absolute inset-0 opacity-[0.06]" style={{
        backgroundImage:
          'radial-gradient(circle at 70% 20%, rgba(255,255,255,1) 0, rgba(255,255,255,0) 40%), radial-gradient(circle at 20% 80%, rgba(255,255,255,0.85) 0, rgba(255,255,255,0) 45%)',
      }} />
      <div className="relative z-10 w-full p-10 lg:p-14 flex flex-col">
        <Link to="/" className="inline-flex items-center gap-2.5 mb-14 group">
          <div className="h-10 w-10 rounded-lg grid place-items-center bg-brand-100 text-brand-900 shadow-sm">
            <Building2 className="h-5.5 w-5.5" strokeWidth={2.2} />
          </div>
          <div className="leading-tight">
            <div className="font-display tracking-tightest font-bold text-[1.1rem]">CivicConnect</div>
            <div className="text-[0.7rem] uppercase tracking-widest text-brand-200/80 font-semibold">Create account</div>
          </div>
        </Link>

        <div className="flex-1 flex flex-col justify-center">
          <div className="inline-flex items-center gap-1.5 text-brand-200 mb-5">
            <Users className="h-4 w-4" />
            <span className="text-[0.76rem] font-semibold uppercase tracking-wider">
              Join {new Date().getFullYear()} cohort
            </span>
          </div>
          <h2 className="font-display tracking-tightest text-[2rem] lg:text-[2.25rem] leading-[1.08] mb-5">
            Be the change your neighborhood needs.
          </h2>
          <p className="text-brand-200/90 leading-relaxed text-[0.95rem] max-w-md mb-10">
            Create a free account in under a minute. Whether you're a citizen submitting reports or a
            public official closing them, this is where the work begins.
          </p>

          <ol className="space-y-5 max-w-md">
            {pillars.map((p) => (
              <li key={p.n} className="flex items-start gap-4">
                <span className="shrink-0 h-9 w-9 rounded-md-plus bg-white/5 border border-white/10 grid place-items-center text-[0.74rem] font-display font-bold tracking-tight tabular text-brand-100">
                  {p.n}
                </span>
                <span>
                  <span className="block font-semibold text-[0.92rem] text-white">{p.title}</span>
                  <span className="block text-[0.82rem] text-brand-200/85 leading-relaxed">{p.desc}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <p className="pt-10 text-[0.76rem] text-brand-200/70">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-white underline underline-offset-4 decoration-brand-500/60 hover:decoration-brand-100">
            Login instead
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    role: 'citizen',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [sentState, setSentState] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const { showError, showSuccess } = useToast();
  const { register } = useAuth();
  const navigate = useNavigate();

  if (sentState) {
    return (
      <div className="min-h-[calc(100vh-12rem)] -mx-4 sm:-mx-6 lg:-mx-8 mt-[-24px] sm:mt-[-32px] mb-[-24px] sm:mb-[-32px] flex bg-white dark:bg-brand-950 animate-fade-in">
        <BrandPanel />

        <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-14">
          <div className="w-full max-w-md">
            <div className="md:hidden flex items-center gap-2 mb-7">
              <div className="h-9 w-9 rounded-md grid place-items-center bg-brand-900 text-white dark:bg-brand-100 dark:text-brand-900">
                <Building2 className="h-5 w-5" strokeWidth={2.2} />
              </div>
              <span className="font-display tracking-tightest font-bold text-brand-950 dark:text-white">
                CivicConnect
              </span>
            </div>

            <Card>
              <CardBody className="py-9">
                <div className="flex flex-col items-center text-center">
                  <div className="h-14 w-14 rounded-full bg-brand-50 dark:bg-brand-500/10 grid place-items-center text-brand-700 dark:text-brand-200">
                    <MailCheck className="h-7 w-7" />
                  </div>
                  <h1 className="mt-5 font-display tracking-tightest text-[1.5rem] leading-tight text-brand-950 dark:text-white">
                    Check your inbox
                  </h1>
                  <p className="mt-2 text-[0.92rem] text-brand-600/90 dark:text-paper-300 leading-relaxed max-w-sm">
                    We sent a 6-digit verification code to{' '}
                    <span className="font-semibold">{sentState.email}</span>. Enter it below within
                    10 minutes to verify your account.
                  </p>
                </div>

                <form
                  className="mt-7 space-y-4"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    if (!/^\d{6}$/.test(verificationCode)) {
                      showError('Enter the 6-digit verification code');
                      return;
                    }
                    try {
                      setVerificationLoading(true);
                      const result = await verifyEmailOtp({
                        email: sentState.email,
                        otp: verificationCode,
                      });
                      showSuccess(result.message || 'Email verified');
                      navigate('/login', { replace: true });
                    } catch (error) {
                      showError(error.message || 'Could not verify the code');
                    } finally {
                      setVerificationLoading(false);
                    }
                  }}
                >
                  <Input
                    id="verification-code"
                    label="Verification code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    required
                    placeholder="6-digit code"
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                  <Button type="submit" size="lg" fullWidth loading={verificationLoading}>
                    Verify email
                  </Button>
                </form>

                <div className="mt-4">
                  <Alert tone="info" title="Didn't receive a code?">
                    Check your spam folder. {resendMessage && <span>{resendMessage} </span>}
                    <button
                      type="button"
                      disabled={resendLoading}
                      onClick={async () => {
                        try {
                          setResendLoading(true);
                          const result = await resendVerification({ email: sentState.email });
                          setResendMessage(result.message);
                          showSuccess(result.message);
                        } catch (error) {
                          showError(error.message || 'Could not resend the code');
                        } finally {
                          setResendLoading(false);
                        }
                      }}
                      className="font-semibold underline underline-offset-4 disabled:opacity-50"
                    >
                      {resendLoading ? 'Sending…' : 'Resend code'}
                    </button>
                    {' '}or{' '}
                    <button
                      type="button"
                      onClick={() => setSentState(null)}
                      className="font-semibold underline underline-offset-4"
                    >
                      register with a different email
                    </button>
                    .
                  </Alert>
                </div>

                <div className="mt-7 grid grid-cols-1 gap-2.5">
                  <Button
                    size="lg"
                    variant="primary"
                    fullWidth
                    onClick={() => navigate('/login', { replace: true })}
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                  >
                    Go to Login
                  </Button>
                  <Button
                    size="md"
                    variant="secondary"
                    fullWidth
                    onClick={() => setSentState(null)}
                  >
                    Register a different account
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'At least 6 characters';
    if (form.password !== form.confirmPassword)
      e.confirmPassword = 'Passwords do not match';
    if (form.phone && !/^[+]?[\d\s-]{10,15}$/.test(form.phone))
      e.phone = 'Enter a valid phone number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    try {
      setLoading(true);
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
        role: form.role,
      };
      const res = await register(payload);
      if (res.data?.token) {
        showSuccess(res.message || 'Account created');
        navigate('/dashboard', { replace: true });
      } else {
        showSuccess(res.message || 'Verification email sent');
        setSentState({ email: form.email });
      }
    } catch (err) {
      showError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-12rem)] -mx-4 sm:-mx-6 lg:-mx-8 mt-[-24px] sm:mt-[-32px] mb-[-24px] sm:mb-[-32px] flex bg-white dark:bg-brand-950 animate-fade-in">
      <BrandPanel />

      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-14 overflow-y-auto">
        <div className="w-full max-w-lg py-6 sm:py-2">
          <div className="md:hidden flex items-center gap-2 mb-7">
            <div className="h-9 w-9 rounded-md grid place-items-center bg-brand-900 text-white dark:bg-brand-100 dark:text-brand-900">
              <Building2 className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <span className="font-display tracking-tightest font-bold text-brand-950 dark:text-white">CivicConnect</span>
          </div>

          <div className="mb-6">
            <h1 className="font-display tracking-tightest text-[1.7rem] leading-tight text-brand-950 dark:text-white mb-1.5">
              Create your account
            </h1>
            <p className="text-[0.9rem] text-brand-700/80 dark:text-paper-300 leading-relaxed">
              Join CivicConnect to report issues, track progress, and vote on the fixes that matter to you.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <div className="label">I am registering as</div>
              <SegmentedControl
                value={form.role}
                onChange={(v) => setForm({ ...form, role: v })}
                options={ROLE_OPTIONS}
                size="sm"
                fullWidth
                className="w-full grid grid-cols-3"
              />
            </div>

            <div className="divider-x -mx-0.5" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="reg-name"
                label="Full Name"
                required
                placeholder="John Doe"
                autoComplete="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                error={errors.name}
              />
              <Input
                id="reg-phone"
                label="Phone (optional)"
                type="tel"
                placeholder="+91 98765 43210"
                autoComplete="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                error={errors.phone}
              />
            </div>
            <Input
              id="reg-email"
              label="Email"
              type="email"
              required
              placeholder="you@example.com"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              error={errors.email}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="reg-password"
                label="Password"
                type="password"
                required
                placeholder="Min 6 chars"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                error={errors.password}
              />
              <Input
                id="reg-confirm"
                label="Confirm Password"
                type="password"
                required
                placeholder="Repeat password"
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                error={errors.confirmPassword}
              />
            </div>

            <div className="pt-1.5">
              <Button
                type="submit"
                size="lg"
                fullWidth
                loading={loading}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Create Account
              </Button>
            </div>
          </form>

          <p className="text-center text-[0.86rem] text-brand-700/85 dark:text-paper-300 mt-7">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-brand-800 dark:text-brand-100 hover:underline underline-offset-4"
            >
              <span className="inline-flex items-center">
                Login
                <ChevronRight className="h-3.5 w-3.5 ml-0.5 -mr-1" />
              </span>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
