import { FiBell, FiMenu, FiSearch } from 'react-icons/fi';

type FacultyNavbarProps = {
  firstName: string;
  department: string;
  profileImage?: string | null;
  pageEyebrow?: string;
  pageTitle: string;
  onOpenSidebar: () => void;
};

function FacultyNavbar({
  firstName,
  department,
  profileImage,
  pageEyebrow = 'Faculty workspace',
  pageTitle,
  onOpenSidebar,
}: FacultyNavbarProps) {
  return (
    <header className="border-b border-[#bcc9d6] bg-[linear-gradient(180deg,rgba(241,245,249,0.94)_0%,rgba(228,236,244,0.92)_100%)] px-4 py-4 backdrop-blur-sm sm:px-7 sm:py-4 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3 lg:hidden">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={onOpenSidebar}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#c1cfdb] bg-[linear-gradient(180deg,rgba(251,252,253,0.98)_0%,rgba(240,245,249,0.94)_100%)] text-[#36557a] shadow-[0_10px_22px_rgba(59,83,112,0.08)] active:scale-[0.98]"
                aria-label="Open faculty sidebar"
              >
                <FiMenu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="truncate text-fluid-3xs font-semibold uppercase tracking-[0.22em] text-[#6f89a4]">
                  {pageEyebrow}
                </p>
                <p className="truncate text-fluid-xl font-semibold tracking-[-0.04em] text-[#173b70]">
                  {pageTitle}
                </p>
              </div>
            </div>

            {profileImage ? (
              <img
                src={profileImage}
                alt={`${firstName} profile`}
                className="h-10 w-10 rounded-full border border-[#c1cfdb] object-cover shadow-[0_8px_18px_rgba(59,83,112,0.08)]"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#c1cfdb] bg-[linear-gradient(180deg,#dde8f2_0%,#ccd9e7_100%)] text-fluid-sm font-bold text-[#2c6d9f] shadow-[0_8px_18px_rgba(59,83,112,0.08)]">
                {firstName.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>

          <div className="hidden lg:block">
            <p className="text-fluid-3xs font-semibold uppercase tracking-[0.22em] text-[#6f89a4]">
              {pageEyebrow}
            </p>
            <h1 className="mt-1 text-fluid-xl font-semibold tracking-[-0.04em] text-[#173b70]">
              {pageTitle}
            </h1>
          </div>
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <div className="flex items-center gap-2 rounded-full border border-[#c1cfdb] bg-[rgba(250,252,253,0.96)] px-4 py-2 shadow-[0_8px_20px_rgba(59,83,112,0.08)]">
            <FiSearch className="h-4 w-4 text-[#6c859f]" />
            <span className="text-fluid-sm text-[#6c859f]">Search faculty tools</span>
          </div>
          <button
            type="button"
            className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[#c1cfdb] bg-[rgba(250,252,253,0.96)] text-[#36557a] shadow-[0_8px_20px_rgba(59,83,112,0.08)]"
          >
            <FiBell className="h-4 w-4" />
            <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#ff8a7a] text-fluid-3xs font-bold text-white">
              2
            </span>
          </button>
          <div className="flex items-center gap-3 rounded-full border border-[#c1cfdb] bg-[rgba(250,252,253,0.96)] px-2.5 py-2 shadow-[0_8px_20px_rgba(59,83,112,0.08)] sm:px-3">
            {profileImage ? (
              <img
                src={profileImage}
                alt={`${firstName} profile`}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(180deg,#dde8f2_0%,#ccd9e7_100%)] text-fluid-sm font-bold text-[#2c6d9f]">
                {firstName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="hidden md:block">
              <p className="text-sm font-semibold text-[#123b74]">{firstName}</p>
              <p className="text-fluid-xs text-[#6c859f]">{department}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default FacultyNavbar;

