import { FiBriefcase, FiMenu, FiShield } from 'react-icons/fi';

type HRNavbarProps = {
  firstName: string;
  department: string;
  profileImage?: string | null;
  pageEyebrow?: string;
  pageTitle: string;
  onOpenSidebar: () => void;
};

function HRNavbar({
  firstName,
  department,
  profileImage,
  pageEyebrow = 'HR workspace',
  pageTitle,
  onOpenSidebar,
}: HRNavbarProps) {
  return (
    <header className="border-b border-[#c8d7ca] bg-[linear-gradient(180deg,rgba(249,251,249,0.96)_0%,rgba(238,245,239,0.94)_100%)] px-4 py-4 backdrop-blur-sm sm:px-7 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3 lg:hidden">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={onOpenSidebar}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#c4d3c6] bg-white text-[#315d43] shadow-[0_10px_22px_rgba(58,88,64,0.08)]"
                aria-label="Open HR sidebar"
              >
                <FiMenu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="truncate text-fluid-3xs font-semibold uppercase tracking-[0.22em] text-[#708c75]">
                  {pageEyebrow}
                </p>
                <p className="truncate text-fluid-xl font-semibold tracking-[-0.04em] text-[#183b25]">
                  {pageTitle}
                </p>
              </div>
            </div>

            {profileImage ? (
              <img
                src={profileImage}
                alt={`${firstName} profile`}
                className="h-10 w-10 rounded-full border border-[#c4d3c6] object-cover shadow-[0_8px_18px_rgba(58,88,64,0.08)]"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#c4d3c6] bg-[linear-gradient(180deg,#dfeae1_0%,#d2dfd4_100%)] text-fluid-sm font-bold text-[#2f7a4f] shadow-[0_8px_18px_rgba(58,88,64,0.08)]">
                {firstName.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>

          <div className="hidden lg:block">
            <p className="text-fluid-3xs font-semibold uppercase tracking-[0.22em] text-[#708c75]">
              {pageEyebrow}
            </p>
            <h1 className="mt-1 text-fluid-xl font-semibold tracking-[-0.04em] text-[#183b25]">
              {pageTitle}
            </h1>
          </div>
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <div className="flex items-center gap-2 rounded-full border border-[#c4d3c6] bg-white px-4 py-2 text-[#5f7c66] shadow-[0_8px_20px_rgba(58,88,64,0.08)]">
            <FiBriefcase className="h-4 w-4" />
            <span className="text-fluid-sm">Workforce operations</span>
          </div>
          <div className="flex items-center gap-3 rounded-full border border-[#c4d3c6] bg-white px-3 py-2 shadow-[0_8px_20px_rgba(58,88,64,0.08)]">
            {profileImage ? (
              <img
                src={profileImage}
                alt={`${firstName} profile`}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(180deg,#dfeae1_0%,#d2dfd4_100%)] text-fluid-sm font-bold text-[#2f7a4f]">
                {firstName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="hidden md:block">
              <p className="text-sm font-semibold text-[#183b25]">{firstName}</p>
              <p className="text-fluid-xs text-[#6a856f]">{department}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(180deg,#2f9b62_0%,#227447_100%)] text-white">
              <FiShield className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default HRNavbar;
