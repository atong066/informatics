import { FiBell, FiMenu, FiMessageCircle, FiSearch } from 'react-icons/fi';

type NavbarProps = {
  firstName: string;
  section: string;
  profileImage?: string | null;
  onOpenSidebar: () => void;
};

function Navbar({ firstName, section, profileImage, onOpenSidebar }: NavbarProps) {
  return (
    <header className="border-b border-[#a9bbcf] bg-[linear-gradient(180deg,rgba(232,239,247,0.96)_0%,rgba(216,227,238,0.94)_100%)] px-4 py-4 backdrop-blur-sm sm:px-7 sm:py-5 lg:px-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3 lg:hidden">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={onOpenSidebar}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#b2c3d4] bg-[linear-gradient(180deg,rgba(247,250,252,0.96)_0%,rgba(231,238,246,0.94)_100%)] text-[#36557a] shadow-[0_10px_22px_rgba(59,83,112,0.09)] active:scale-[0.98]"
                aria-label="Open sidebar"
              >
                <FiMenu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="text-fluid-3xs font-semibold uppercase tracking-[0.26em] text-[#2b79ba]">
                Student workspace
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#b2c3d4] bg-[linear-gradient(180deg,rgba(247,250,252,0.96)_0%,rgba(231,238,246,0.94)_100%)] text-[#36557a] shadow-[0_8px_18px_rgba(59,83,112,0.08)]"
              >
                <FiBell className="h-4 w-4" />
                <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#ff8a7a] text-fluid-3xs font-bold text-white">
                  3
                </span>
              </button>
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={`${firstName} profile`}
                  className="h-10 w-10 rounded-full border border-[#b2c3d4] object-cover shadow-[0_8px_18px_rgba(59,83,112,0.08)]"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#b2c3d4] bg-[linear-gradient(180deg,#d9e7f5_0%,#c6d9ed_100%)] text-fluid-sm font-bold text-[#2b79ba] shadow-[0_8px_18px_rgba(59,83,112,0.08)]">
                  {firstName.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
          </div>
          <p className="hidden text-fluid-2xs font-semibold uppercase tracking-[0.24em] text-[#2b79ba] lg:block">
            Student workspace
          </p>
          <h1 className="mt-4 hidden max-w-[9ch] text-fluid-2xl font-semibold leading-[0.98] tracking-[-0.05em] text-[#163b73] sm:max-w-none sm:text-fluid-3xl lg:mt-3 lg:block lg:text-fluid-3xl">
            Student Dashboard
          </h1>
          <p className="mt-2 hidden max-w-[3.52rem] text-fluid-base leading-7 text-[#58728f] lg:block">
            Check what needs attention, what is due next, and how your term is moving.
          </p>
        </div>

        <div className="hidden flex-wrap items-center gap-3 lg:flex lg:justify-end">
          <div className="hidden items-center gap-2 rounded-full border border-[#b8c8d8] bg-[rgba(245,249,252,0.92)] px-4 py-2 shadow-[0_8px_20px_rgba(59,83,112,0.08)] sm:flex">
            <FiSearch className="h-4 w-4 text-[#69829e]" />
            <span className="text-fluid-sm text-[#69829e]">Search portal</span>
          </div>
          <button
            type="button"
            className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[#b8c8d8] bg-[rgba(245,249,252,0.92)] text-[#36557a] shadow-[0_8px_20px_rgba(59,83,112,0.08)]"
          >
            <FiBell className="h-4 w-4" />
            <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#ff8a7a] text-fluid-3xs font-bold text-white">
              3
            </span>
          </button>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#b8c8d8] bg-[rgba(245,249,252,0.92)] text-[#36557a] shadow-[0_8px_20px_rgba(59,83,112,0.08)]"
          >
            <FiMessageCircle className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3 rounded-full border border-[#b8c8d8] bg-[rgba(245,249,252,0.92)] px-2.5 py-2 shadow-[0_8px_20px_rgba(59,83,112,0.08)] sm:px-3">
            {profileImage ? (
              <img
                src={profileImage}
                alt={`${firstName} profile`}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(180deg,#cadcf0_0%,#bacfe6_100%)] text-fluid-sm font-bold text-[#2b79ba]">
                {firstName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="hidden md:block">
              <p className="text-sm font-semibold text-[#123b74]">{firstName}</p>
              <p className="text-fluid-xs text-[#69829e]">{section}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;

