import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { FiCamera, FiEdit3, FiUploadCloud } from 'react-icons/fi';
import CustomDatePicker from '../../components/CustomDatePicker';
import Modal from '../../components/Modal';
import NotificationPopup from '../../components/NotificationPopup';
import { getStoredToken, setAuthSession } from '../../lib/auth';
import { compressProfileImage } from '../../lib/image';
import StudentLayout from '../../layout/student/StudentLayout';
import { useCurrentStudent } from '../../hooks/useCurrentStudent';

function Profile() {
  const queryClient = useQueryClient();
  const { activeUser, isError } = useCurrentStudent();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formValues, setFormValues] = useState({
    email: '',
    contactNumber: '',
    birthdate: '',
    address: '',
  });
  const [formErrors, setFormErrors] = useState<{
    email?: string;
    contactNumber?: string;
    birthdate?: string;
    address?: string;
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

  const fullName = [
    activeUser.firstName,
    activeUser.middleName,
    activeUser.lastName,
  ]
    .filter(Boolean)
    .join(' ');

  const infoCards = [
    { label: 'Email address', value: activeUser.email },
    { label: 'Username', value: activeUser.username },
    { label: 'Contact number', value: activeUser.contactNumber },
    { label: 'Birthdate', value: activeUser.birthdate },
    { label: 'Section', value: activeUser.section },
    { label: 'Address', value: activeUser.address },
  ];

  const profileMutation = useMutation({
    mutationFn: async (values: typeof formValues) => {
      if (!token) {
        throw new Error('Your session has expired. Please sign in again.');
      }

      const response = await fetch('/api/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      });

      const data = (await response.json()) as {
        message?: string;
        errors?: Record<string, string[]>;
        data?: typeof activeUser;
      };

      if (!response.ok || !data.data) {
        const fieldErrors = data.errors ?? {};
        setFormErrors({
          email: fieldErrors.email?.[0],
          contactNumber: fieldErrors.contactNumber?.[0],
          birthdate: fieldErrors.birthdate?.[0],
          address: fieldErrors.address?.[0],
        });
        throw new Error(data.message || 'Failed to update profile');
      }

      setAuthSession({
        token,
        user: data.data,
      });

      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      setIsEditModalOpen(false);
      setFormErrors({});
      setNotification({
        open: true,
        title: 'Profile updated',
        message: 'Your account information has been updated successfully.',
        variant: 'success',
      });
    },
    onError: (error) => {
      if (Object.keys(formErrors).length > 0) {
        return;
      }

      setNotification({
        open: true,
        title: 'Update failed',
        message: error instanceof Error ? error.message : 'Failed to update profile.',
        variant: 'error',
      });
    },
  });

  const photoMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!token) {
        throw new Error('Your session has expired. Please sign in again.');
      }

      const imageDataUrl = await compressProfileImage(file);
      const response = await fetch('/api/me/profile-photo', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ imageDataUrl }),
      });

      const data = (await response.json()) as {
        message?: string;
        data?: typeof activeUser;
      };

      if (!response.ok || !data.data) {
        throw new Error(data.message || 'Failed to update profile photo');
      }

      setAuthSession({
        token,
        user: data.data,
      });

      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      setNotification({
        open: true,
        title: 'Profile photo updated',
        message: 'Your new profile picture has been saved successfully.',
        variant: 'success',
      });
    },
    onError: (error) => {
      setNotification({
        open: true,
        title: 'Upload failed',
        message: error instanceof Error ? error.message : 'Failed to update profile photo.',
        variant: 'error',
      });
    },
  });

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
      <Modal
        open={isEditModalOpen}
        title="Edit profile information"
        description="Update the contact information tied to your student account."
        onClose={() => {
          setIsEditModalOpen(false);
          setFormErrors({});
        }}
        actions={(
          <>
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
                setFormErrors({});
              }}
              className="rounded-full border border-[#c7d7e6] bg-white px-4 py-2.5 text-[14px] font-semibold text-[#48617d] transition hover:bg-[#f7fafc]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setFormErrors({});
                profileMutation.mutate(formValues);
              }}
              disabled={profileMutation.isPending}
              className="rounded-full bg-[linear-gradient(180deg,#2b79ba_0%,#235f97_100%)] px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_10px_20px_rgba(27,46,70,0.18)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {profileMutation.isPending ? 'Saving changes...' : 'Save changes'}
            </button>
          </>
        )}
      >
        <div className="grid gap-4">
          <label className="grid gap-2">
            <span className="text-[13px] font-semibold text-[#244d7f]">Email address</span>
            <input
              type="email"
              value={formValues.email}
              onChange={(event) => {
                setFormValues((current) => ({ ...current, email: event.target.value }));
                setFormErrors((current) => ({ ...current, email: undefined }));
              }}
              className="rounded-[1.2rem] border border-[#cad8e5] bg-white px-4 py-3 text-[15px] text-[#173b70] outline-none transition focus:border-[#6aa6d6] focus:ring-2 focus:ring-[#c8dff1]"
            />
            {formErrors.email ? (
              <span className="text-[12px] font-medium text-rose-600">{formErrors.email}</span>
            ) : null}
          </label>

          <label className="grid gap-2">
            <span className="text-[13px] font-semibold text-[#244d7f]">Contact number</span>
            <input
              type="text"
              value={formValues.contactNumber}
              onChange={(event) => {
                setFormValues((current) => ({ ...current, contactNumber: event.target.value }));
                setFormErrors((current) => ({ ...current, contactNumber: undefined }));
              }}
              className="rounded-[1.2rem] border border-[#cad8e5] bg-white px-4 py-3 text-[15px] text-[#173b70] outline-none transition focus:border-[#6aa6d6] focus:ring-2 focus:ring-[#c8dff1]"
            />
            {formErrors.contactNumber ? (
              <span className="text-[12px] font-medium text-rose-600">
                {formErrors.contactNumber}
              </span>
            ) : null}
          </label>

          <div className="grid gap-2">
            <span className="text-[13px] font-semibold text-[#244d7f]">Birthdate</span>
            <CustomDatePicker
              id="profile-birthdate"
              value={formValues.birthdate}
              onChange={(value) => {
                setFormValues((current) => ({ ...current, birthdate: value }));
                setFormErrors((current) => ({ ...current, birthdate: undefined }));
              }}
              error={formErrors.birthdate}
              menuPosition="bottom"
            />
          </div>

          <label className="grid gap-2">
            <span className="text-[13px] font-semibold text-[#244d7f]">Address</span>
            <textarea
              value={formValues.address}
              onChange={(event) => {
                setFormValues((current) => ({ ...current, address: event.target.value }));
                setFormErrors((current) => ({ ...current, address: undefined }));
              }}
              rows={4}
              className="resize-none rounded-[1.2rem] border border-[#cad8e5] bg-white px-4 py-3 text-[15px] text-[#173b70] outline-none transition focus:border-[#6aa6d6] focus:ring-2 focus:ring-[#c8dff1]"
            />
            {formErrors.address ? (
              <span className="text-[12px] font-medium text-rose-600">{formErrors.address}</span>
            ) : null}
          </label>
        </div>
      </Modal>
      <div className="grid gap-5 px-4 py-5 sm:px-7 lg:px-8">
        <section className="rounded-[2rem] border border-[#b8cddd] bg-[linear-gradient(120deg,#eef4f9_0%,#e4edf5_38%,#dde7f0_100%)] px-5 py-6 shadow-[0_18px_34px_rgba(49,70,98,0.1)] sm:px-6">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#2b79ba]">
                Student profile
              </p>
              <h2 className="mt-3 text-[2rem] font-semibold leading-[1.02] tracking-[-0.05em] text-[#173b70] sm:text-[2.35rem]">
                Your account details, academic identity, and contact information.
              </h2>
              <p className="mt-3 max-w-3xl text-[14px] leading-6 text-[#5f7896]">
                Review the details connected to your portal account and keep your
                student information up to date.
              </p>
            </div>

            <div className="rounded-[1.7rem] bg-[linear-gradient(180deg,#365678_0%,#284463_100%)] px-5 py-5 text-white shadow-[0_20px_32px_rgba(27,46,70,0.2)]">
              <p className="text-[12px] text-[#d2dfec]">Student identity</p>
              <p className="mt-3 text-[1.35rem] font-semibold leading-tight">{fullName}</p>
              <p className="mt-2 text-[14px] text-[#e8eff6]">{activeUser.section}</p>
              <p className="mt-4 text-[14px] text-[#d2dfec]">@{activeUser.username}</p>
            </div>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
          <section className="rounded-[1.9rem] border border-[#bfcedd] bg-[linear-gradient(180deg,#f3f7fb_0%,#edf3f8_100%)] p-5 shadow-[0_16px_30px_rgba(49,70,98,0.08)] sm:p-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                {activeUser.profileImage ? (
                  <img
                    src={activeUser.profileImage}
                    alt={`${fullName} profile`}
                    className="h-28 w-28 rounded-full object-cover shadow-[0_12px_28px_rgba(49,70,98,0.16)]"
                  />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[linear-gradient(180deg,#d9e6f3_0%,#c9d9ea_100%)] text-[2rem] font-semibold text-[#1d5f9a] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
                    {activeUser.firstName[0]}
                    {activeUser.lastName[0]}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={photoMutation.isPending}
                  className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full border border-white/90 bg-[linear-gradient(180deg,#2b79ba_0%,#235f97_100%)] text-white shadow-[0_10px_20px_rgba(27,46,70,0.2)] transition hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-70"
                  aria-label="Change profile picture"
                >
                  <FiCamera className="h-4 w-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];

                    if (!file) {
                      return;
                    }

                    photoMutation.mutate(file);
                    event.target.value = '';
                  }}
                />
              </div>
              <h3 className="mt-5 text-[1.3rem] font-semibold text-[#123b74]">{fullName}</h3>
              <p className="mt-2 text-[14px] text-[#7088a1]">{activeUser.email}</p>
              <div className="mt-5 inline-flex rounded-full border border-[#c4d5e4] bg-[#f5f9fc] px-4 py-2 text-[13px] font-semibold text-[#2b79ba]">
                {activeUser.section}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={photoMutation.isPending}
                className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#c4d5e4] bg-white/80 px-4 py-2 text-[13px] font-semibold text-[#2b79ba] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                <FiUploadCloud className="h-4 w-4" />
                {photoMutation.isPending ? 'Uploading photo...' : 'Upload profile photo'}
              </button>
              <p className="mt-3 text-[12px] leading-5 text-[#7088a1]">
                JPG, PNG, or WebP. The image is compressed before upload for faster loading.
              </p>
            </div>
          </section>

          <section className="rounded-[1.9rem] border border-[#bfcedd] bg-[linear-gradient(180deg,#f3f7fb_0%,#edf3f8_100%)] p-5 shadow-[0_16px_30px_rgba(49,70,98,0.08)] sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[1.12rem] font-semibold text-[#123b74]">Account information</p>
                <p className="mt-1 text-[13px] text-[#7088a1]">
                  Profile data currently stored in your student portal account.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormValues({
                    email: activeUser.email,
                    contactNumber: activeUser.contactNumber,
                    birthdate: activeUser.birthdate,
                    address: activeUser.address,
                  });
                  setFormErrors({});
                  setIsEditModalOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-full border border-[#c4d5e4] bg-[#f5f9fc] px-4 py-2 text-[13px] font-semibold text-[#2b79ba] shadow-[0_6px_16px_rgba(49,70,98,0.06)] transition hover:bg-white"
              >
                <FiEdit3 className="h-4 w-4" />
                Edit
              </button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {infoCards.map((item) => (
                <article
                  key={item.label}
                  className="rounded-[1.45rem] border border-[#d3dee8] bg-[#f8fbfd] px-4 py-4"
                >
                  <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#7391ae]">
                    {item.label}
                  </p>
                  <p className="mt-3 text-[1rem] font-semibold text-[#123b74]">{item.value}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </StudentLayout>
  );
}

export default Profile;
