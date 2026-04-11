import { FiBookOpen, FiCode, FiCpu, FiDatabase, FiGrid, FiLogOut, FiUsers, FiX } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import { useFacultySubjects } from '../../hooks/useFacultySubjects';
import { clearStoredUser } from '../../lib/auth';

type FacultySidebarProps = {
  fullName: string;
  username: string;
  profileImage?: string | null;
  isOpen?: boolean;
  onClose?: () => void;
};

const facultyTools = [{ label: 'Dashboard', icon: FiGrid, path: '/faculty/dashboard' }];
const studentManagementItems = [
  { label: 'Student List', icon: FiUsers, path: '/faculty/student-list' },
];

function getSubjectIcon(iconKey: string) {
  switch (iconKey) {
    case 'database':
      return FiDatabase;
    case 'code':
      return FiCode;
    case 'cpu':
      return FiCpu;
    default:
      return FiBookOpen;
  }
}

function FacultySidebar({
  fullName,
  username,
  profileImage,
  isOpen = true,
  onClose,
}: FacultySidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const subjectsQuery = useFacultySubjects();
  const subjectItems = subjectsQuery.data ?? [];
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((value) => value[0]?.toUpperCase())
    .join('');

  return (
    <aside
      className={`h-full w-[82vw] max-w-[296px] overflow-y-auto border-r border-white/8 bg-[linear-gradient(180deg,#1f3248_0%,#28435f_52%,#345778_100%)] px-4 py-5 text-white shadow-[0_24px_48px_rgba(8,24,49,0.38)] ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-out lg:w-full lg:max-w-none lg:translate-x-0 lg:shadow-none`}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex min-h-full flex-col">
        <div className="flex items-center justify-between gap-3 px-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#66a8de_0%,#3478b4_100%)] shadow-[0_14px_28px_rgba(14,46,90,0.24)]">
              <img
                src="/images/logo.png"
                alt="Informatics Philippines logo"
                className="max-h-7 max-w-7 object-contain brightness-[2.7] contrast-125"
              />
            </div>
            <div>
              <p className="text-[1.28rem] font-semibold tracking-[-0.03em] text-white">
                NALAKA LMS
              </p>
              <p className="text-[13px] text-[#d0ddea]">Faculty Portal</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onClose?.()}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-[#d8e7f6] lg:hidden"
            aria-label="Close faculty sidebar"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 border-t border-white/10 pt-4">
          <div className="rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.07)_100%)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <div className="flex items-center gap-3">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={`${fullName} profile`}
                  className="h-14 w-14 rounded-full object-cover shadow-[0_10px_22px_rgba(8,24,49,0.22)]"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eef4fb] text-[1.2rem] font-bold text-[#2c6d9f]">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-white">{fullName}</p>
                <p className="mt-1 text-[13px] text-[#d0ddea]">{username}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 px-2">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#b7c9da]">Faculty tools</p>
          <div className="mt-4 space-y-2">
            {facultyTools.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    onClose?.();
                    navigate(item.path);
                  }}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                    location.pathname === item.path
                      ? 'border-[#88aed0] bg-[linear-gradient(180deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0.09)_100%)] text-white shadow-[inset_3px_0_0_#9dc0df,0_12px_24px_rgba(9,31,62,0.16)]'
                      : 'border-transparent text-[#e6eff9] hover:bg-white/8'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="text-[15px] font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 px-2">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#b7c9da]">
            Student management
          </p>
          <div className="mt-4 space-y-2">
            {studentManagementItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    onClose?.();
                    navigate(item.path);
                  }}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                    location.pathname === item.path
                      ? 'border-[#88aed0] bg-[linear-gradient(180deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0.09)_100%)] text-white shadow-[inset_3px_0_0_#9dc0df,0_12px_24px_rgba(9,31,62,0.16)]'
                      : 'border-transparent text-[#e6eff9] hover:bg-white/8'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="text-[15px] font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 px-2">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#b7c9da]">Subjects</p>
          <div className="mt-4 space-y-2">
            {subjectsQuery.isLoading ? (
              <p className="px-4 py-2 text-[13px] text-[#d7e6f4]">Loading subjects...</p>
            ) : subjectsQuery.isError ? (
              <p className="px-4 py-2 text-[13px] text-[#f8c2c2]">Failed to load subjects.</p>
            ) : subjectItems.length > 0 ? (
              subjectItems.map((item) => {
                const Icon = getSubjectIcon(item.iconKey);
                const subjectPath = `/faculty/subjects/${item.id}`;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onClose?.();
                      navigate(subjectPath);
                    }}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                      location.pathname === subjectPath
                        ? 'border-[#88aed0] bg-[linear-gradient(180deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0.09)_100%)] text-white shadow-[inset_3px_0_0_#9dc0df,0_12px_24px_rgba(9,31,62,0.16)]'
                        : 'border-transparent text-[#e6eff9] hover:bg-white/8'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[15px] font-medium">{item.title}</p>
                      <p className="truncate text-[12px] text-[#d0ddea]">{item.code}</p>
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="px-4 py-2 text-[13px] text-[#d7e6f4]">No subjects yet.</p>
            )}
          </div>
        </div>

        <div className="mt-auto px-2 pt-6">
          <button
            type="button"
            onClick={() => {
              onClose?.();
              clearStoredUser();
              navigate('/login', { replace: true });
            }}
            className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-left text-white transition hover:bg-white/12"
          >
            <span className="flex items-center gap-3">
              <FiLogOut className="h-4 w-4" />
              <span className="text-[15px] font-medium">Sign out</span>
            </span>
            <span className="text-[#d0ddea]">{'>'}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

export default FacultySidebar;
