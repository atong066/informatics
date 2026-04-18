import { FiBookOpen, FiGrid, FiLayers, FiLogOut, FiShield, FiUsers, FiX } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import { clearStoredUser } from '../../lib/auth';

type AdminSidebarProps = {
  fullName: string;
  username: string;
  profileImage?: string | null;
  isOpen?: boolean;
  onClose?: () => void;
};

const adminTools = [
  { label: 'Dashboard', icon: FiGrid, path: '/admin/dashboard' },
  { label: 'Subjects', icon: FiBookOpen, path: '/admin/subjects' },
  { label: 'Curriculums', icon: FiLayers, path: '/admin/curriculums' },
  { label: 'Sections', icon: FiUsers, path: '/admin/sections' },
  { label: 'Faculty', icon: FiShield, path: '/admin/faculty' },
];

function AdminSidebar({
  fullName,
  username,
  profileImage,
  isOpen = true,
  onClose,
}: AdminSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((value) => value[0]?.toUpperCase())
    .join('');

  return (
    <aside
      className={`h-full w-[80vw] max-w-[288px] overflow-y-auto border-r border-white/10 bg-[linear-gradient(180deg,#17333b_0%,#1f4652_55%,#295766_100%)] px-3 py-4 text-white shadow-[0_20px_40px_rgba(9,31,37,0.3)] ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-out lg:w-full lg:max-w-none lg:translate-x-0 lg:shadow-none`}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex min-h-full flex-col">
        <div className="flex items-center justify-between gap-3 px-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[linear-gradient(180deg,#2aa493_0%,#1b7d71_100%)] shadow-[0_12px_22px_rgba(9,31,37,0.22)]">
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
              <p className="text-fluid-xs text-[#d2e5e8]">Admin Portal</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onClose?.()}
            className="flex h-9 w-9 items-center justify-center rounded-[1rem] border border-white/10 bg-white/8 text-[#d8eff1] lg:hidden"
            aria-label="Close admin sidebar"
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
                  className="h-12 w-12 rounded-full object-cover shadow-[0_10px_22px_rgba(9,31,37,0.22)]"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eef8f7] text-fluid-lg font-bold text-[#1b7d71]">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-fluid-base font-semibold text-white">{fullName}</p>
                <p className="mt-0.5 text-fluid-xs text-[#d2e5e8]">@{username}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 px-2">
          <p className="text-fluid-2xs uppercase tracking-[0.24em] text-[#bbd4d9]">Admin tools</p>
          <div className="mt-3 space-y-1.5">
            {adminTools.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    onClose?.();
                    navigate(item.path);
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-[1rem] border px-3 py-2.5 text-left transition ${
                    isActive
                      ? 'border-[#8ecfc6] bg-[linear-gradient(180deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0.09)_100%)] text-white shadow-[inset_3px_0_0_#9fddd5,0_10px_18px_rgba(9,31,37,0.16)]'
                      : 'border-transparent text-[#e8f5f7] hover:bg-white/7'
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
          <p className="text-fluid-2xs uppercase tracking-[0.24em] text-[#bbd4d9]">Workspace</p>
          <div className="mt-3 rounded-[1.2rem] border border-white/10 bg-white/8 px-4 py-4 text-[#d7eaee]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#2aa493_0%,#1b7d71_100%)] text-white">
                <FiLayers className="h-4 w-4" />
              </div>
              <div>
                <p className="text-fluid-sm font-semibold text-white">Curriculum planning</p>
                <p className="mt-1 text-fluid-xs leading-5 text-[#cce1e5]">
                  Manage subjects, curriculums, sections, advisers, and teacher loads.
                </p>
              </div>
            </div>
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
            <FiShield className="h-4 w-4 text-[#d2e5e8]" />
          </button>
        </div>
      </div>
    </aside>
  );
}

export default AdminSidebar;
