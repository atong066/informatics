import { useState, type ReactNode } from 'react';
import AdminNavbar from './Navbar';
import AdminSidebar from './Sidebar';

type AdminLayoutProps = {
  firstName: string;
  fullName: string;
  section: string;
  username: string;
  profileImage?: string | null;
  pageEyebrow?: string;
  pageTitle: string;
  children: ReactNode;
};

function AdminLayout({
  firstName,
  fullName,
  section,
  username,
  profileImage,
  pageEyebrow,
  pageTitle,
  children,
}: AdminLayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <main className="h-screen overflow-hidden bg-[#e4ecef] text-slate-900">
      <div className="relative grid h-full lg:grid-cols-[248px_1fr]">
        {isMobileSidebarOpen ? (
          <>
            <div
              className="drawer-overlay absolute inset-0 z-30 bg-[#10252b]/46 backdrop-blur-[3px] lg:hidden"
              onClick={() => setIsMobileSidebarOpen(false)}
              aria-hidden="true"
            />
            <div className="drawer-panel fixed inset-y-0 left-0 z-40 lg:hidden">
              <AdminSidebar
                fullName={fullName}
                username={username}
                profileImage={profileImage}
                isOpen
                onClose={() => setIsMobileSidebarOpen(false)}
              />
            </div>
          </>
        ) : null}

        <div className="hidden lg:block">
          <AdminSidebar
            fullName={fullName}
            username={username}
            profileImage={profileImage}
          />
        </div>

        <div className="flex min-w-0 flex-col overflow-hidden bg-[linear-gradient(180deg,#f3f8f9_0%,#e8f0f2_46%,#dfe9ec_100%)]">
          <AdminNavbar
            firstName={firstName}
            section={section}
            profileImage={profileImage}
            pageEyebrow={pageEyebrow}
            pageTitle={pageTitle}
            onOpenSidebar={() => setIsMobileSidebarOpen(true)}
          />
          <div className="relative min-h-0 min-w-0 flex-1 overflow-y-auto">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(42,164,147,0.12),transparent_18%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.6),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(86,125,140,0.08),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.24)_0%,rgba(255,255,255,0)_34%)]"
            />
            <div className="relative">{children}</div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default AdminLayout;
