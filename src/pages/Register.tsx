import { useMutation } from '@tanstack/react-query';
import { type ChangeEvent, type FormEvent, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import CustomDatePicker from '../components/CustomDatePicker';
import CustomSelect from '../components/CustomSelect';
import NotificationPopup from '../components/NotificationPopup';

const sectionOptions = [
  'DCS-B6',
  'DCS-B7',
  'DCS-B8',
  'DCS-B9',
  'DIT-B7',
  'DIT-B8',
];

type RegistrationForm = {
  lastName: string;
  firstName: string;
  middleName: string;
  address: string;
  contactNumber: string;
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  section: string;
  birthdate: string;
};

type FieldErrors = Partial<Record<keyof RegistrationForm, string>>;
type RegistrationError = Error & {
  fieldErrors?: FieldErrors;
};

type NotificationState = {
  open: boolean;
  title: string;
  message: string;
  variant: 'success' | 'error';
};

const initialForm: RegistrationForm = {
  lastName: '',
  firstName: '',
  middleName: '',
  address: '',
  contactNumber: '',
  email: '',
  username: '',
  password: '',
  confirmPassword: '',
  section: '',
  birthdate: '',
};

function Register() {
  const [form, setForm] = useState<RegistrationForm>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
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

  const registerMutation = useMutation({
    mutationFn: async (payload: Omit<RegistrationForm, 'confirmPassword'>) => {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        message?: string;
        errors?: Record<string, string[]>;
      };

      if (!response.ok) {
        const error = new Error(data.message || 'Account creation failed') as RegistrationError;

        if (data.errors) {
          error.fieldErrors = Object.fromEntries(
            Object.entries(data.errors).map(([key, value]) => [
              key,
              value?.[0] ?? '',
            ]),
          ) as FieldErrors;
        }

        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      setForm(initialForm);
      setFieldErrors({});
      setNotification({
        open: true,
        title: 'Registration successful',
        message: data.message ?? 'User account created successfully',
        variant: 'success',
      });
    },
    onError: (error: RegistrationError) => {
      setFieldErrors(error.fieldErrors ?? {});
      setNotification({
        open: true,
        title: 'Registration failed',
        message: error.message || 'Please review the form details and try again.',
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
      ...(name === 'password' || name === 'confirmPassword'
        ? { confirmPassword: '' }
        : {}),
    }));

    closeNotification();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    closeNotification();

    const nextFieldErrors: FieldErrors = {};

    if (!form.confirmPassword.trim()) {
      nextFieldErrors.confirmPassword = 'Confirm password is required';
    } else if (form.password !== form.confirmPassword) {
      nextFieldErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors((current) => ({
        ...current,
        ...nextFieldErrors,
      }));
      setNotification({
        open: true,
        title: 'Registration failed',
        message: 'Please complete the required fields before submitting.',
        variant: 'error',
      });
      return;
    }

    const { confirmPassword, ...payload } = form;
    void confirmPassword;
    registerMutation.mutate(payload);
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
        <section className="w-full max-w-xl rounded-[1.75rem] border border-white/55 bg-[#ecf0f1] p-5 shadow-[0_30px_80px_rgba(16,33,53,0.28)] sm:p-6">
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
                Registration v2
              </p>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#3498db]">
              Student registration
            </p>
            <h1 className="mt-3 font-display text-[2rem] leading-tight text-slate-950 sm:text-[1.8rem]">
              Create your account
            </h1>
            <p className="mt-2 text-[13px] leading-5 text-[#5d6d7e]">
              Enter your student details below to begin registration.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="relative block">
                <span className="mb-2 block text-[13px] font-medium text-[#34495e]">
                  Last name
                </span>
                {fieldErrors.lastName ? (
                  <div className="pointer-events-none absolute -top-11 left-0 z-20 rounded-xl border border-red-200 bg-white px-3 py-2 text-[12px] font-medium text-red-500 shadow-[0_10px_24px_rgba(239,68,68,0.12)]">
                    {fieldErrors.lastName}
                    <span className="absolute left-4 top-full h-2 w-2 -translate-y-1/2 rotate-45 border-b border-r border-red-200 bg-white" />
                  </div>
                ) : null}
                <input
                  name="lastName"
                  type="text"
                  value={form.lastName}
                  onChange={handleInputChange}
                  placeholder="Dela Cruz"
                  className={`w-full rounded-2xl border bg-white px-4 py-3 text-[15px] text-[#2c3e50] outline-none transition duration-200 placeholder:text-[#95a5a6] ${
                    fieldErrors.lastName
                      ? 'border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-100'
                      : 'border-[#bdc3c7] focus:border-[#3498db] focus:ring-4 focus:ring-sky-100'
                  }`}
                />
              </label>

              <label className="relative block">
                <span className="mb-2 block text-[13px] font-medium text-[#34495e]">
                  First name
                </span>
                {fieldErrors.firstName ? (
                  <div className="pointer-events-none absolute -top-11 left-0 z-20 rounded-xl border border-red-200 bg-white px-3 py-2 text-[12px] font-medium text-red-500 shadow-[0_10px_24px_rgba(239,68,68,0.12)]">
                    {fieldErrors.firstName}
                    <span className="absolute left-4 top-full h-2 w-2 -translate-y-1/2 rotate-45 border-b border-r border-red-200 bg-white" />
                  </div>
                ) : null}
                <input
                  name="firstName"
                  type="text"
                  value={form.firstName}
                  onChange={handleInputChange}
                  placeholder="Juan"
                  className={`w-full rounded-2xl border bg-white px-4 py-3 text-[15px] text-[#2c3e50] outline-none transition duration-200 placeholder:text-[#95a5a6] ${
                    fieldErrors.firstName
                      ? 'border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-100'
                      : 'border-[#bdc3c7] focus:border-[#3498db] focus:ring-4 focus:ring-sky-100'
                  }`}
                />
              </label>
            </div>

            <label className="relative block">
              <span className="mb-2 block text-[13px] font-medium text-[#34495e]">
                Middle name
              </span>
              {fieldErrors.middleName ? (
                <div className="pointer-events-none absolute -top-11 left-0 z-20 rounded-xl border border-red-200 bg-white px-3 py-2 text-[12px] font-medium text-red-500 shadow-[0_10px_24px_rgba(239,68,68,0.12)]">
                  {fieldErrors.middleName}
                  <span className="absolute left-4 top-full h-2 w-2 -translate-y-1/2 rotate-45 border-b border-r border-red-200 bg-white" />
                </div>
              ) : null}
              <input
                name="middleName"
                type="text"
                value={form.middleName}
                onChange={handleInputChange}
                placeholder="Santos"
                className={`w-full rounded-2xl border bg-white px-4 py-3 text-[15px] text-[#2c3e50] outline-none transition duration-200 placeholder:text-[#95a5a6] ${
                  fieldErrors.middleName
                    ? 'border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-100'
                    : 'border-[#bdc3c7] focus:border-[#3498db] focus:ring-4 focus:ring-sky-100'
                }`}
              />
            </label>

            <label className="relative block">
              <span className="mb-2 block text-[13px] font-medium text-[#34495e]">
                Address
              </span>
              {fieldErrors.address ? (
                <div className="pointer-events-none absolute -top-11 left-0 z-20 rounded-xl border border-red-200 bg-white px-3 py-2 text-[12px] font-medium text-red-500 shadow-[0_10px_24px_rgba(239,68,68,0.12)]">
                  {fieldErrors.address}
                  <span className="absolute left-4 top-full h-2 w-2 -translate-y-1/2 rotate-45 border-b border-r border-red-200 bg-white" />
                </div>
              ) : null}
              <input
                name="address"
                type="text"
                value={form.address}
                onChange={handleInputChange}
                placeholder="Bayombong"
                className={`w-full rounded-2xl border bg-white px-4 py-3 text-[15px] text-[#2c3e50] outline-none transition duration-200 placeholder:text-[#95a5a6] ${
                  fieldErrors.address
                    ? 'border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-100'
                    : 'border-[#bdc3c7] focus:border-[#3498db] focus:ring-4 focus:ring-sky-100'
                }`}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="relative block">
                <span className="mb-2 block text-[13px] font-medium text-[#34495e]">
                  Contact number
                </span>
                {fieldErrors.contactNumber ? (
                  <div className="pointer-events-none absolute -top-11 left-0 z-20 rounded-xl border border-red-200 bg-white px-3 py-2 text-[12px] font-medium text-red-500 shadow-[0_10px_24px_rgba(239,68,68,0.12)]">
                    {fieldErrors.contactNumber}
                    <span className="absolute left-4 top-full h-2 w-2 -translate-y-1/2 rotate-45 border-b border-r border-red-200 bg-white" />
                  </div>
                ) : null}
                <input
                  name="contactNumber"
                  type="tel"
                  value={form.contactNumber}
                  onChange={handleInputChange}
                  placeholder="09XX XXX XXXX"
                  className={`w-full rounded-2xl border bg-white px-4 py-3 text-[15px] text-[#2c3e50] outline-none transition duration-200 placeholder:text-[#95a5a6] ${
                    fieldErrors.contactNumber
                      ? 'border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-100'
                      : 'border-[#bdc3c7] focus:border-[#3498db] focus:ring-4 focus:ring-sky-100'
                  }`}
                />
              </label>

              <label className="relative block">
                <span className="mb-2 block text-[13px] font-medium text-[#34495e]">
                  Email
                </span>
                {fieldErrors.email ? (
                  <div className="pointer-events-none absolute -top-11 left-0 z-20 rounded-xl border border-red-200 bg-white px-3 py-2 text-[12px] font-medium text-red-500 shadow-[0_10px_24px_rgba(239,68,68,0.12)]">
                    {fieldErrors.email}
                    <span className="absolute left-4 top-full h-2 w-2 -translate-y-1/2 rotate-45 border-b border-r border-red-200 bg-white" />
                  </div>
                ) : null}
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleInputChange}
                  placeholder="student@informatics.edu"
                  className={`w-full rounded-2xl border bg-white px-4 py-3 text-[15px] text-[#2c3e50] outline-none transition duration-200 placeholder:text-[#95a5a6] ${
                    fieldErrors.email
                      ? 'border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-100'
                      : 'border-[#bdc3c7] focus:border-[#3498db] focus:ring-4 focus:ring-sky-100'
                  }`}
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-[13px] font-medium text-[#34495e]">
                  Section
                </span>
                <CustomSelect
                  id="section"
                  value={form.section}
                  onChange={(value) => {
                    setForm((current) => ({ ...current, section: value }));
                    setFieldErrors((current) => ({ ...current, section: '' }));
                    closeNotification();
                  }}
                  error={fieldErrors.section}
                  options={sectionOptions}
                  placeholder="Select section"
                  menuPosition="top"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[13px] font-medium text-[#34495e]">
                  Birthdate
                </span>
                <CustomDatePicker
                  id="birthdate"
                  value={form.birthdate}
                  onChange={(value) => {
                    setForm((current) => ({ ...current, birthdate: value }));
                    setFieldErrors((current) => ({ ...current, birthdate: '' }));
                    closeNotification();
                  }}
                  error={fieldErrors.birthdate}
                  placeholder="Select date"
                  menuPosition="top"
                />
              </label>
            </div>

            <div className="pt-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#3498db]">
                Account setup
              </p>
              <p className="mt-2 text-[13px] leading-5 text-[#5d6d7e]">
                Choose your username and secure your account password.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="relative block sm:col-span-2">
                <span className="mb-2 block text-[13px] font-medium text-[#34495e]">
                  Username
                </span>
                {fieldErrors.username ? (
                  <div className="pointer-events-none absolute -top-11 left-0 z-20 rounded-xl border border-red-200 bg-white px-3 py-2 text-[12px] font-medium text-red-500 shadow-[0_10px_24px_rgba(239,68,68,0.12)]">
                    {fieldErrors.username}
                    <span className="absolute left-4 top-full h-2 w-2 -translate-y-1/2 rotate-45 border-b border-r border-red-200 bg-white" />
                  </div>
                ) : null}
                <input
                  name="username"
                  type="text"
                  value={form.username}
                  onChange={handleInputChange}
                  placeholder="juan.delacruz"
                  className={`w-full rounded-2xl border bg-white px-4 py-3 text-[15px] text-[#2c3e50] outline-none transition duration-200 placeholder:text-[#95a5a6] ${
                    fieldErrors.username
                      ? 'border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-100'
                      : 'border-[#bdc3c7] focus:border-[#3498db] focus:ring-4 focus:ring-sky-100'
                  }`}
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="relative block">
                <span className="mb-2 block text-[13px] font-medium text-[#34495e]">
                  Password
                </span>
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
                  placeholder="Create a password"
                  className={`w-full rounded-2xl border bg-white px-4 py-3 text-[15px] text-[#2c3e50] outline-none transition duration-200 placeholder:text-[#95a5a6] ${
                    fieldErrors.password
                      ? 'border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-100'
                      : 'border-[#bdc3c7] focus:border-[#3498db] focus:ring-4 focus:ring-sky-100'
                  }`}
                />
              </label>

              <label className="relative block">
                <span className="mb-2 block text-[13px] font-medium text-[#34495e]">
                  Confirm password
                </span>
                {fieldErrors.confirmPassword ? (
                  <div className="pointer-events-none absolute -top-11 left-0 z-20 rounded-xl border border-red-200 bg-white px-3 py-2 text-[12px] font-medium text-red-500 shadow-[0_10px_24px_rgba(239,68,68,0.12)]">
                    {fieldErrors.confirmPassword}
                    <span className="absolute left-4 top-full h-2 w-2 -translate-y-1/2 rotate-45 border-b border-r border-red-200 bg-white" />
                  </div>
                ) : null}
                <input
                  name="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Re-enter your password"
                  className={`w-full rounded-2xl border bg-white px-4 py-3 text-[15px] text-[#2c3e50] outline-none transition duration-200 placeholder:text-[#95a5a6] ${
                    fieldErrors.confirmPassword
                      ? 'border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-100'
                      : 'border-[#bdc3c7] focus:border-[#3498db] focus:ring-4 focus:ring-sky-100'
                  }`}
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="w-full rounded-2xl bg-[#3498db] px-4 py-3 text-[15px] font-semibold text-white shadow-[0_14px_30px_rgba(52,152,219,0.25)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#2d89c6] hover:shadow-[0_18px_36px_rgba(52,152,219,0.32)] focus:outline-none focus:ring-4 focus:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {registerMutation.isPending ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <div className="mt-6 border-t border-[#d6dde2] pt-4">
            <div className="flex items-center justify-between gap-4 text-[13px] text-[#7f8c8d]">
              <p>Already have an account?</p>
              <Link
                to="/login"
                className="font-medium text-[#2c3e50] transition hover:text-[#3498db]"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Register;
