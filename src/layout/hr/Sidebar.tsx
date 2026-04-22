import { FiBriefcase, FiClipboard, FiDollarSign, FiGrid, FiLogOut, FiShield, FiUsers, FiX } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import { clearStoredUser } from '../../lib/auth';

type HRSidebarProps = {
  fullName: string;
  username: string;
  profileImage?: string | null;
  isOpen?: boolean;
  onClose?: () => void;
};

const hrTools = [
  { label: 'Dashboard', icon: FiGrid, path: '/hr/dashboard' },
  { label: 'Workforce', icon: FiUsers, path: '/hr/workforce' },
  { label: 'Onboarding', icon: FiClipboard, path: '/hr/onboarding' },
  { label: 'Payroll', icon: FiDollarSign, path: '/hr/payroll' },
];

function HRSidebar({
  fullName,
  username,
  profileImage,
  isOpen = true,
  onClose,
}: HRSidebarProps) {
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
      className={`h-full w-[80vw] max-w-[288px] overflow-y-auto border-r border-white/10 bg-[linear-gradient(180deg,#183b25_0%,#255735_55%,#2f6840_100%)] px-3 py-4 text-white shadow-[0_20px_40px_rgba(13,35,20,0.3)] ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-out lg:w-full lg:max-w-none lg:translate-x-0 lg:shadow-none`}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex min-h-full flex-col">
        <div className="flex items-center justify-between gap-3 px-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[0.16rem] bg-[linear-gradient(180deg,#52b676_0%,#2f8a52_100%)] shadow-[0_12px_22px_rgba(13,35,20,0.22)]">
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
              <p className="text-fluid-xs text-[#d6eadb]">HR Portal</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onClose?.()}
            className="flex h-9 w-9 items-center justify-center rounded-[0.16rem] border border-white/10 bg-white/8 text-[#dff0e3] lg:hidden"
            aria-label="Close HR sidebar"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 border-t border-white/10 pt-3.5">
          <div className="rounded-[0.192rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.07)_100%)] px-3.5 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <div className="flex items-center gap-3">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={`${fullName} profile`}
                  className="h-12 w-12 rounded-full object-cover shadow-[0_10px_22px_rgba(13,35,20,0.22)]"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eef8f0] text-fluid-lg font-bold text-[#2f8a52]">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-fluid-base font-semibold text-white">{fullName}</p>
                <p className="mt-0.5 text-fluid-xs text-[#d6eadb]">@{username}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 px-2">
          <p className="text-fluid-2xs uppercase tracking-[0.24em] text-[#c0dcc7]">HR tools</p>
          <div className="mt-3 space-y-1.5">
            {hrTools.map((item) => {
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
                  className={`flex w-full items-center gap-2.5 rounded-[0.16rem] border px-3 py-2.5 text-left transition ${
                    isActive
                      ? 'border-[#a8dcb5] bg-[linear-gradient(180deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0.09)_100%)] text-white shadow-[inset_3px_0_0_#b8e6c2,0_10px_18px_rgba(13,35,20,0.16)]'
                      : 'border-transparent text-[#ebf8ee] hover:bg-white/7'
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
          <p className="text-fluid-2xs uppercase tracking-[0.24em] text-[#c0dcc7]">Focus</p>
          <div className="mt-3 rounded-[0.192rem] border border-white/10 bg-white/8 px-4 py-4 text-[#d8eddd]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#52b676_0%,#2f8a52_100%)] text-white">
                <FiBriefcase className="h-4 w-4" />
              </div>
              <div>
                <p className="text-fluid-sm font-semibold text-white">People operations</p>
                <p className="mt-1 text-fluid-xs leading-5 text-[#d1e8d7]">
                  Manage employees, onboarding, payroll status, and workforce records.
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
            className="flex w-full items-center justify-between rounded-[0.16rem] border border-white/10 bg-white/8 px-3.5 py-2.5 text-left text-white transition hover:bg-white/12"
          >
            <span className="flex items-center gap-3">
              <FiLogOut className="h-4 w-4" />
              <span className="text-fluid-base font-medium">Sign out</span>
            </span>
            <FiShield className="h-4 w-4 text-[#d6eadb]" />
          </button>
        </div>
      </div>
    </aside>
  );
}

export default HRSidebar;
