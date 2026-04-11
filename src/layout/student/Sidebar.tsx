import {
  FiLogOut,
  FiSettings,
  FiUser,
  FiX,
} from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import { clearStoredUser } from '../../lib/auth';

type SidebarProps = {
  fullName: string;
  username: string;
  profileImage?: string | null;
  isOpen?: boolean;
  onClose?: () => void;
};

const navItems = [
  // { label: 'Dashboard', icon: FiGrid, section: 'workspace', path: '/student/dashboard' },
  // { label: 'My Subjects', icon: FiBookOpen, section: 'workspace' },
  // { label: 'My Grades', icon: FiClipboard, section: 'workspace' },
  // { label: 'Assessments', icon: FiClipboard, section: 'workspace' },
  // { label: 'My Schedule', icon: FiCalendar, section: 'support' },
  // { label: 'Calendar', icon: FiCalendar, section: 'support' },
  { label: 'Profile', icon: FiUser, section: 'support', path: '/student/profile' },
  { label: 'Settings', icon: FiSettings, section: 'support', path: '/student/settings' },
];

function Sidebar({
  fullName,
  username,
  profileImage,
  isOpen = true,
  onClose,
}: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const workspaceItems = navItems.filter((item) => item.section === 'workspace');
  const supportItems = navItems.filter((item) => item.section === 'support');
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((value) => value[0]?.toUpperCase())
    .join('');

  return (
    <aside
      className={`h-full w-[82vw] max-w-[296px] overflow-y-auto border-r border-white/8 bg-[linear-gradient(180deg,#142d4c_0%,#1a416d_58%,#215487_100%)] px-4 py-5 text-white shadow-[0_24px_48px_rgba(8,24,49,0.38)] ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-out lg:w-full lg:max-w-none lg:translate-x-0 lg:shadow-none`}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex min-h-full flex-col">
        <div className="flex items-center justify-between gap-3 px-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#2bb8ea_0%,#1d86d0_100%)] shadow-[0_14px_28px_rgba(14,46,90,0.28)]">
              <img
                src="/images/logo.png"
                alt="Informatics Philippines logo"
                className="max-h-7 max-w-7 object-contain brightness-[2.8] contrast-125"
              />
            </div>
            <div>
              <p className="text-[1.35rem] font-semibold tracking-[-0.03em] text-white">
                NALAKA LMS
              </p>
              <p className="text-[13px] text-[#c4d9ee]">Student Portal</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onClose?.()}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-[#d8e7f6] lg:hidden"
            aria-label="Close sidebar"
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
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eef4fb] text-[1.2rem] font-bold text-[#1d5f9a]">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-white">{fullName}</p>
                <p className="mt-1 text-[13px] text-[#cfe0f0]">{username}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 px-2">
          <div className="space-y-2">
            {workspaceItems.map((item, index) => {
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
                    location.pathname === item.path || (index === 0 && location.pathname === '/dashboard')
                      ? 'border-[#6eaad9] bg-[linear-gradient(180deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.08)_100%)] text-white shadow-[inset_3px_0_0_#72b7e6,0_12px_24px_rgba(9,31,62,0.18)]'
                      : 'border-transparent bg-transparent text-[#e6eff9] hover:bg-white/8'
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
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#b8cee3]">Support</p>
          <div className="mt-4 space-y-2">
            {supportItems.map((item) => {
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
                      ? 'border-[#6eaad9] bg-[linear-gradient(180deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.08)_100%)] text-white shadow-[inset_3px_0_0_#72b7e6,0_12px_24px_rgba(9,31,62,0.18)]'
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
            <span className="text-[#cfe0f0]">{'>'}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
