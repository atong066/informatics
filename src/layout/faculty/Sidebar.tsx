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
      className={`h-full w-[80vw] max-w-[288px] overflow-y-auto border-r border-white/8 bg-[linear-gradient(180deg,#22364d_0%,#29445f_55%,#314f6d_100%)] px-3 py-4 text-white shadow-[0_20px_40px_rgba(8,24,49,0.3)] ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-out lg:w-full lg:max-w-none lg:translate-x-0 lg:shadow-none`}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex min-h-full flex-col">
        <div className="flex items-center justify-between gap-3 px-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[linear-gradient(180deg,#66a8de_0%,#3478b4_100%)] shadow-[0_12px_22px_rgba(14,46,90,0.2)]">
              <img
                src="/images/logo.png"
                alt="Informatics Philippines logo"
                className="max-h-7 max-w-7 object-contain brightness-[2.7] contrast-125"
              />
            </div>
            <div>
              <p className="text-fluid-xl font-semibold tracking-[-0.03em] text-white">
                NALAKA LMS
              </p>
              <p className="text-fluid-xs text-[#d0ddea]">Faculty Portal</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onClose?.()}
            className="flex h-9 w-9 items-center justify-center rounded-[1rem] border border-white/10 bg-white/8 text-[#d8e7f6] lg:hidden"
            aria-label="Close faculty sidebar"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 border-t border-white/10 pt-3.5">
          <div className="rounded-[1.2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.07)_100%)] px-3.5 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <div className="flex items-center gap-3">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={`${fullName} profile`}
                  className="h-12 w-12 rounded-full object-cover shadow-[0_10px_22px_rgba(8,24,49,0.22)]"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eef4fb] text-fluid-lg font-bold text-[#2c6d9f]">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-fluid-base font-semibold text-white">{fullName}</p>
                <p className="mt-0.5 text-fluid-xs text-[#d0ddea]">@{username}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 px-2">
          <p className="text-fluid-2xs uppercase tracking-[0.24em] text-[#b7c9da]">Faculty tools</p>
          <div className="mt-3 space-y-1.5">
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
                  className={`flex w-full items-center gap-2.5 rounded-[1rem] border px-3 py-2.5 text-left transition ${
                    location.pathname === item.path
                      ? 'border-[#88aed0] bg-[linear-gradient(180deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0.09)_100%)] text-white shadow-[inset_3px_0_0_#9dc0df,0_10px_18px_rgba(9,31,62,0.14)]'
                      : 'border-transparent text-[#e6eff9] hover:bg-white/7'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="text-fluid-base font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 px-2">
          <p className="text-fluid-2xs uppercase tracking-[0.24em] text-[#b7c9da]">
            Student management
          </p>
          <div className="mt-3 space-y-1.5">
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
                  className={`flex w-full items-center gap-2.5 rounded-[1rem] border px-3 py-2.5 text-left transition ${
                    location.pathname === item.path
                      ? 'border-[#88aed0] bg-[linear-gradient(180deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0.09)_100%)] text-white shadow-[inset_3px_0_0_#9dc0df,0_10px_18px_rgba(9,31,62,0.14)]'
                      : 'border-transparent text-[#e6eff9] hover:bg-white/7'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="text-fluid-base font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 px-2">
          <p className="text-fluid-2xs uppercase tracking-[0.24em] text-[#b7c9da]">Subjects</p>
          <div className="mt-3 space-y-1.5">
            {subjectsQuery.isLoading ? (
              <p className="px-3 py-2 text-fluid-xs text-[#d7e6f4]">Loading subjects...</p>
            ) : subjectsQuery.isError ? (
              <p className="px-3 py-2 text-fluid-xs text-[#f8c2c2]">Failed to load subjects.</p>
            ) : subjectItems.length > 0 ? (
              subjectItems.map((item) => {
                const Icon = getSubjectIcon(item.iconKey);
                const subjectPath = `/faculty/subjects/${item.id}`;
                const isSubjectActive =
                  location.pathname === subjectPath || location.pathname.startsWith(`${subjectPath}/`);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onClose?.();
                      navigate(subjectPath);
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-[1rem] border px-3 py-2.5 text-left transition ${
                      isSubjectActive
                        ? 'border-[#88aed0] bg-[linear-gradient(180deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0.09)_100%)] text-white shadow-[inset_3px_0_0_#9dc0df,0_10px_18px_rgba(9,31,62,0.14)]'
                        : 'border-transparent text-[#e6eff9] hover:bg-white/7'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                      <p className="truncate text-fluid-base font-medium">{item.title}</p>
                      <span className="shrink-0 rounded-full border border-white/12 bg-white/7 px-2 py-0.5 text-fluid-3xs font-semibold uppercase tracking-[0.12em] text-[#d0ddea]">
                        {item.code}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-2 text-fluid-xs text-[#d7e6f4]">No subjects yet.</p>
            )}
          </div>
        </div>

        <div className="mt-auto px-2 pt-5">
          <button
            type="button"
            onClick={() => {
              onClose?.();
              clearStoredUser();
              navigate('/login', { replace: true });
            }}
            className="flex w-full items-center justify-between rounded-[1rem] border border-white/10 bg-white/8 px-3.5 py-2.5 text-left text-white transition hover:bg-white/12"
          >
            <span className="flex items-center gap-3">
              <FiLogOut className="h-4 w-4" />
              <span className="text-fluid-base font-medium">Sign out</span>
            </span>
            <span className="text-[#d0ddea]">{'>'}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

export default FacultySidebar;

