import { useMutation } from '@tanstack/react-query';
import { type ChangeEvent, type FormEvent, useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import NotificationPopup from '../components/NotificationPopup';
import { setAuthSession } from '../lib/auth';

const portalHighlights = [
  'Access schedules, announcements, and student services in one secure place.',
  'Designed to match the updated registration flow for a calmer account experience.',
];

type LoginForm = {
  identifier: string;
  password: string;
};

type LoginFieldErrors = Partial<Record<keyof LoginForm, string>>;
type LoginError = Error & {
  fieldErrors?: LoginFieldErrors;
};

type NotificationState = {
  open: boolean;
  title: string;
  message: string;
  variant: 'success' | 'error';
};

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState<LoginForm>({
    identifier: '',
    password: '',
  });
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    title: '',
    message: '',
    variant: 'success',
  });

  const closeNotification = useCallback(() => {
    setNotification((current) => ({
      ...current,
      open: false,
    }));
  }, []);

  const loginMutation = useMutation({
    mutationFn: async (payload: LoginForm) => {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        message?: string;
        token?: string;
        data?: Record<string, unknown>;
        errors?: Record<string, string[]>;
      };

      if (!response.ok) {
        const error = new Error(data.message || 'Login failed') as LoginError;

        if (data.errors) {
          error.fieldErrors = Object.fromEntries(
            Object.entries(data.errors).map(([key, value]) => [
              key,
              value?.[0] ?? '',
            ]),
          ) as LoginFieldErrors;
        }

        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      setFieldErrors({});
      setNotification({
        open: true,
        title: 'Login successful',
        message: data.message ?? 'Welcome back to your portal.',
        variant: 'success',
      });

      if (data.token && data.data) {
        setAuthSession({
          token: data.token,
          user: data.data as Parameters<typeof setAuthSession>[0]['user'],
        });
      }

      window.setTimeout(() => {
        navigate('/dashboard');
      }, 250);
    },
    onError: (error: LoginError) => {
      setFieldErrors(error.fieldErrors ?? {});
      setNotification({
        open: true,
        title: 'Login failed',
        message: error.message || 'Please check your credentials and try again.',
        variant: 'error',
      });
    },
  });

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
    setFieldErrors((current) => ({
      ...current,
      [name]: '',
    }));
    closeNotification();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    closeNotification();

    const nextFieldErrors: LoginFieldErrors = {};

    if (!form.identifier.trim()) {
      nextFieldErrors.identifier = 'Username or email is required';
    }

    if (!form.password) {
      nextFieldErrors.password = 'Password is required';
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setNotification({
        open: true,
        title: 'Login failed',
        message: 'Please enter your credentials before signing in.',
        variant: 'error',
      });
      return;
    }

    loginMutation.mutate({
      identifier: form.identifier.trim(),
      password: form.password,
    });
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(145deg,_#1f3a5f_0%,_#234d77_55%,_#2c5f92_100%)] px-5 py-8 text-slate-900 sm:px-8">
      <NotificationPopup
        open={notification.open}
        title={notification.title}
        message={notification.message}
        variant={notification.variant}
        onClose={closeNotification}
      />

      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:84px_84px] opacity-30" />
      <div className="absolute left-[-8rem] top-[-6rem] h-72 w-72 rounded-full bg-[#3498db]/18 blur-3xl" />
      <div className="absolute bottom-[-8rem] right-[-3rem] h-80 w-80 rounded-full bg-[#5dade2]/14 blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <section className="grid w-full max-w-5xl gap-0 overflow-hidden rounded-[1.9rem] border border-white/45 bg-[#ecf0f1] shadow-[0_30px_80px_rgba(16,33,53,0.28)] lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative hidden overflow-hidden border-r border-[#d6dde2] bg-[linear-gradient(180deg,_rgba(255,255,255,0.72)_0%,_rgba(237,243,248,0.82)_100%)] p-8 lg:flex lg:flex-col lg:justify-between">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(52,152,219,0.16),transparent_38%)]" />

            <div className="relative">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#3498db]">
                Secure portal
              </p>
              <h1 className="mt-4 font-display text-[2.9rem] leading-[0.95] text-slate-950">
                Welcome back to your campus account.
              </h1>
              <p className="mt-4 max-w-md text-[14px] leading-6 text-[#5d6d7e]">
                Continue with the same cleaner visual system used in registration,
                tuned for everyday sign-in, schedules, and student support access.
              </p>
            </div>

            <div className="relative space-y-4">
              {portalHighlights.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-2xl border border-white/65 bg-white/70 px-4 py-4 shadow-[0_14px_30px_rgba(44,62,80,0.08)]"
                >
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#3498db]" />
                  <p className="text-sm leading-6 text-[#34495e]">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 sm:p-6 lg:p-8">
            <div className="mb-6 flex items-center gap-3 border-b border-[#d6dde2] pb-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#d6dde2] bg-white p-2 shadow-[0_8px_18px_rgba(44,62,80,0.08)]">
                <img
                  src="/images/logo.png"
                  alt="Informatics Philippines logo"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div>
                <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-slate-950">
                  Informatics
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-[#3498db]">
                  Student portal login
                </p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#3498db]">
                Secure access
              </p>
              <h2 className="mt-3 font-display text-[2rem] leading-tight text-slate-950 sm:text-[1.8rem]">
                Sign in to your account
              </h2>
              <p className="mt-2 text-[13px] leading-5 text-[#5d6d7e]">
                Use your username or school email together with your password to
                continue to the portal.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="relative block">
                <span className="mb-2 block text-[13px] font-medium text-[#34495e]">
                  Username or email
                </span>
                {fieldErrors.identifier ? (
                  <div className="pointer-events-none absolute -top-11 left-0 z-20 rounded-xl border border-red-200 bg-white px-3 py-2 text-[12px] font-medium text-red-500 shadow-[0_10px_24px_rgba(239,68,68,0.12)]">
                    {fieldErrors.identifier}
                    <span className="absolute left-4 top-full h-2 w-2 -translate-y-1/2 rotate-45 border-b border-r border-red-200 bg-white" />
                  </div>
                ) : null}
                <input
                  name="identifier"
                  type="text"
                  value={form.identifier}
                  onChange={handleInputChange}
                  placeholder="student@informatics.edu"
                  className={`w-full rounded-2xl border bg-white px-4 py-3 text-[15px] text-[#2c3e50] outline-none transition duration-200 placeholder:text-[#95a5a6] ${
                    fieldErrors.identifier
                      ? 'border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-100'
                      : 'border-[#bdc3c7] focus:border-[#3498db] focus:ring-4 focus:ring-sky-100'
                  }`}
                />
              </label>

              <label className="relative block">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-[13px] font-medium text-[#34495e]">
                    Password
                  </span>
                  <a
                    href="#"
                    className="text-[13px] font-medium text-[#3498db] transition hover:text-[#2d89c6]"
                  >
                    Forgot password?
                  </a>
                </div>
                {fieldErrors.password ? (
                  <div className="pointer-events-none absolute -top-11 left-0 z-20 rounded-xl border border-red-200 bg-white px-3 py-2 text-[12px] font-medium text-red-500 shadow-[0_10px_24px_rgba(239,68,68,0.12)]">
                    {fieldErrors.password}
                    <span className="absolute left-4 top-full h-2 w-2 -translate-y-1/2 rotate-45 border-b border-r border-red-200 bg-white" />
                  </div>
                ) : null}
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleInputChange}
                  placeholder="Enter your password"
                  className={`w-full rounded-2xl border bg-white px-4 py-3 text-[15px] text-[#2c3e50] outline-none transition duration-200 placeholder:text-[#95a5a6] ${
                    fieldErrors.password
                      ? 'border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-100'
                      : 'border-[#bdc3c7] focus:border-[#3498db] focus:ring-4 focus:ring-sky-100'
                  }`}
                />
              </label>

              <div className="flex flex-col gap-3 text-[13px] text-[#5d6d7e] sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[#bdc3c7] text-[#3498db] focus:ring-sky-200"
                  />
                  <span>Keep this device trusted</span>
                </label>
                <span>Protected sign-in</span>
              </div>

              <button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full rounded-2xl bg-[#3498db] px-4 py-3 text-[15px] font-semibold text-white shadow-[0_14px_30px_rgba(52,152,219,0.25)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#2d89c6] hover:shadow-[0_18px_36px_rgba(52,152,219,0.32)] focus:outline-none focus:ring-4 focus:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
              >
                {loginMutation.isPending ? 'Signing in...' : 'Sign in to portal'}
              </button>
            </form>

            <div className="mt-6 grid gap-4 border-t border-[#d6dde2] pt-4">
              <div className="flex items-center justify-between gap-4 text-[13px] text-[#7f8c8d]">
                <p>Need admin onboarding?</p>
                <a
                  href="#"
                  className="font-medium text-[#2c3e50] transition hover:text-[#3498db]"
                >
                  Request access
                </a>
              </div>
              <div className="flex items-center justify-between gap-4 text-[13px] text-[#7f8c8d]">
                <p>New student applicant?</p>
                <Link
                  to="/register"
                  className="font-medium text-[#2c3e50] transition hover:text-[#3498db]"
                >
                  Create account
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Login;
