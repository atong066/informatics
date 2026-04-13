import { FiLayers, FiMenu, FiShield } from 'react-icons/fi';

type AdminNavbarProps = {
  firstName: string;
  section: string;
  profileImage?: string | null;
  pageEyebrow?: string;
  pageTitle: string;
  onOpenSidebar: () => void;
};

function AdminNavbar({
  firstName,
  section,
  profileImage,
  pageEyebrow = 'Admin workspace',
  pageTitle,
  onOpenSidebar,
}: AdminNavbarProps) {
  return (
    <header className="border-b border-[#cfd8df] bg-[linear-gradient(180deg,rgba(247,250,252,0.96)_0%,rgba(236,242,246,0.94)_100%)] px-4 py-4 backdrop-blur-sm sm:px-7 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3 lg:hidden">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={onOpenSidebar}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#c9d4db] bg-white text-[#2f5666] shadow-[0_10px_22px_rgba(60,88,104,0.08)]"
                aria-label="Open admin sidebar"
              >
                <FiMenu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="truncate text-fluid-3xs font-semibold uppercase tracking-[0.22em] text-[#72909d]">
                  {pageEyebrow}
                </p>
                <p className="truncate text-fluid-xl font-semibold tracking-[-0.04em] text-[#173b47]">
                  {pageTitle}
                </p>
              </div>
            </div>

            {profileImage ? (
              <img
                src={profileImage}
                alt={`${firstName} profile`}
                className="h-10 w-10 rounded-full border border-[#c9d4db] object-cover shadow-[0_8px_18px_rgba(60,88,104,0.08)]"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#c9d4db] bg-[linear-gradient(180deg,#dbe7eb_0%,#cfdbe0_100%)] text-fluid-sm font-bold text-[#2c697f] shadow-[0_8px_18px_rgba(60,88,104,0.08)]">
                {firstName.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>

          <div className="hidden lg:block">
            <p className="text-fluid-3xs font-semibold uppercase tracking-[0.22em] text-[#72909d]">
              {pageEyebrow}
            </p>
            <h1 className="mt-1 text-fluid-xl font-semibold tracking-[-0.04em] text-[#173b47]">
              {pageTitle}
            </h1>
          </div>
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <div className="flex items-center gap-2 rounded-full border border-[#c9d4db] bg-white px-4 py-2 text-[#5f7885] shadow-[0_8px_20px_rgba(60,88,104,0.08)]">
            <FiLayers className="h-4 w-4" />
            <span className="text-fluid-sm">Curriculum control center</span>
          </div>
          <div className="flex items-center gap-3 rounded-full border border-[#c9d4db] bg-white px-3 py-2 shadow-[0_8px_20px_rgba(60,88,104,0.08)]">
            {profileImage ? (
              <img
                src={profileImage}
                alt={`${firstName} profile`}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(180deg,#dbe7eb_0%,#cfdbe0_100%)] text-fluid-sm font-bold text-[#2c697f]">
                {firstName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="hidden md:block">
              <p className="text-sm font-semibold text-[#173b47]">{firstName}</p>
              <p className="text-fluid-xs text-[#6d8794]">{section}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(180deg,#1f8a78_0%,#166b5d_100%)] text-white">
              <FiShield className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default AdminNavbar;
