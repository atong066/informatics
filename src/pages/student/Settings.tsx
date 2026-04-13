import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { FiLock } from 'react-icons/fi';
import NotificationPopup from '../../components/NotificationPopup';
import { getStoredToken } from '../../lib/auth';
import StudentLayout from '../../layout/student/StudentLayout';
import { useCurrentStudent } from '../../hooks/useCurrentStudent';

function Settings() {
  const queryClient = useQueryClient();
  const { activeUser, isError } = useCurrentStudent();
  const [formValues, setFormValues] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [formErrors, setFormErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [notification, setNotification] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: 'success' | 'error';
  }>({
    open: false,
    title: '',
    message: '',
    variant: 'success',
  });

  if (!activeUser || isError) {
    return null;
  }

  const token = getStoredToken();
  const fullName = [activeUser.firstName, activeUser.middleName, activeUser.lastName]
    .filter(Boolean)
    .join(' ');

  const passwordMutation = useMutation({
    mutationFn: async () => {
      if (!token) {
        throw new Error('Your session has expired. Please sign in again.');
      }

      const response = await fetch('/api/me/password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: formValues.currentPassword,
          newPassword: formValues.newPassword,
        }),
      });

      const data = (await response.json()) as {
        message?: string;
        errors?: Record<string, string[]>;
      };

      if (!response.ok) {
        const fieldErrors = data.errors ?? {};
        setFormErrors({
          currentPassword: fieldErrors.currentPassword?.[0],
          newPassword: fieldErrors.newPassword?.[0],
        });
        throw new Error(data.message || 'Failed to update password');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      setFormValues({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setFormErrors({});
      setNotification({
        open: true,
        title: 'Password updated',
        message: 'Your password has been changed successfully.',
        variant: 'success',
      });
    },
    onError: (error) => {
      if (Object.keys(formErrors).some((key) => formErrors[key as keyof typeof formErrors])) {
        return;
      }

      setNotification({
        open: true,
        title: 'Password update failed',
        message: error instanceof Error ? error.message : 'Failed to update password.',
        variant: 'error',
      });
    },
  });

  function submitPasswordChange() {
    const nextErrors: typeof formErrors = {};

    if (!formValues.currentPassword) {
      nextErrors.currentPassword = 'Current password is required';
    }

    if (formValues.newPassword.length < 8) {
      nextErrors.newPassword = 'New password must be at least 8 characters';
    }

    if (formValues.confirmPassword !== formValues.newPassword) {
      nextErrors.confirmPassword = 'Passwords do not match';
    }

    setFormErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    passwordMutation.mutate();
  }

  return (
    <StudentLayout
      firstName={activeUser.firstName}
      fullName={fullName}
      section={activeUser.section}
      username={activeUser.username}
      profileImage={activeUser.profileImage}
    >
      <NotificationPopup
        open={notification.open}
        title={notification.title}
        message={notification.message}
        variant={notification.variant}
        onClose={() => setNotification((current) => ({ ...current, open: false }))}
      />

      <div className="grid gap-5 px-4 py-5 sm:px-7 lg:px-8">
        <section className="rounded-[2rem] border border-[#b8cddd] bg-[linear-gradient(120deg,#eef4f9_0%,#e4edf5_38%,#dde7f0_100%)] px-5 py-6 shadow-[0_18px_34px_rgba(49,70,98,0.1)] sm:px-6">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
            <div>
              <p className="text-fluid-2xs font-semibold uppercase tracking-[0.24em] text-[#2b79ba]">
                Security settings
              </p>
              <h2 className="mt-3 text-fluid-3xl font-semibold leading-[1.02] tracking-[-0.05em] text-[#173b70] sm:text-fluid-4xl">
                Update your account password and keep your student access secure.
              </h2>
              <p className="mt-3 max-w-3xl text-fluid-base leading-6 text-[#5f7896]">
                Use a strong password that only you know. After updating, your existing
                session will keep working.
              </p>
            </div>

            <div className="rounded-[1.7rem] bg-[linear-gradient(180deg,#365678_0%,#284463_100%)] px-5 py-5 text-white shadow-[0_20px_32px_rgba(27,46,70,0.2)]">
              <p className="text-fluid-xs text-[#d2dfec]">Account security</p>
              <p className="mt-3 text-fluid-xl font-semibold leading-tight">{activeUser.email}</p>
              <p className="mt-2 text-fluid-base text-[#e8eff6]">@{activeUser.username}</p>
              <p className="mt-4 text-fluid-base text-[#d2dfec]">Password can be changed below.</p>
            </div>
          </div>
        </section>

        <section className="rounded-[1.9rem] border border-[#bfcedd] bg-[linear-gradient(180deg,#f3f7fb_0%,#edf3f8_100%)] p-5 shadow-[0_16px_30px_rgba(49,70,98,0.08)] sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#d7e4f2_0%,#c7d9ea_100%)] text-[#2b79ba]">
              <FiLock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-fluid-xl font-semibold text-[#123b74]">Change password</p>
              <p className="mt-1 text-fluid-sm text-[#7088a1]">
                Confirm your current password before saving a new one.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:max-w-xl">
            <Field
              label="Current password"
              type="password"
              value={formValues.currentPassword}
              error={formErrors.currentPassword}
              onChange={(value) => {
                setFormValues((current) => ({ ...current, currentPassword: value }));
                setFormErrors((current) => ({ ...current, currentPassword: undefined }));
              }}
            />

            <Field
              label="New password"
              type="password"
              value={formValues.newPassword}
              error={formErrors.newPassword}
              onChange={(value) => {
                setFormValues((current) => ({ ...current, newPassword: value }));
                setFormErrors((current) => ({ ...current, newPassword: undefined }));
              }}
            />

            <Field
              label="Confirm new password"
              type="password"
              value={formValues.confirmPassword}
              error={formErrors.confirmPassword}
              onChange={(value) => {
                setFormValues((current) => ({ ...current, confirmPassword: value }));
                setFormErrors((current) => ({ ...current, confirmPassword: undefined }));
              }}
            />

            <div className="pt-2">
              <button
                type="button"
                onClick={submitPasswordChange}
                disabled={passwordMutation.isPending}
                className="rounded-full bg-[linear-gradient(180deg,#2b79ba_0%,#235f97_100%)] px-5 py-3 text-fluid-base font-semibold text-white shadow-[0_10px_20px_rgba(27,46,70,0.18)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {passwordMutation.isPending ? 'Updating password...' : 'Update password'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </StudentLayout>
  );
}

function Field({
  label,
  type,
  value,
  error,
  onChange,
}: {
  label: string;
  type: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-fluid-sm font-semibold text-[#244d7f]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-[1.2rem] border border-[#cad8e5] bg-white px-4 py-3 text-fluid-md text-[#173b70] outline-none transition focus:border-[#6aa6d6] focus:ring-2 focus:ring-[#c8dff1]"
      />
      {error ? <span className="text-fluid-xs font-medium text-rose-600">{error}</span> : null}
    </label>
  );
}

export default Settings;

