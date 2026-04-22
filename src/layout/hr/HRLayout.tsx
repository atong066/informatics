import { useState, type ReactNode } from 'react';
import HRNavbar from './Navbar';
import HRSidebar from './Sidebar';

type HRLayoutProps = {
  firstName: string;
  fullName: string;
  department: string;
  username: string;
  profileImage?: string | null;
  pageEyebrow?: string;
  pageTitle: string;
  children: ReactNode;
};

function HRLayout({
  firstName,
  fullName,
  department,
  username,
  profileImage,
  pageEyebrow,
  pageTitle,
  children,
}: HRLayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <main className="h-screen overflow-hidden bg-[#e7eee8] text-slate-900">
      <div className="relative grid h-full lg:grid-cols-[248px_1fr]">
        {isMobileSidebarOpen ? (
          <>
            <div
              className="drawer-overlay absolute inset-0 z-30 bg-[#14251c]/46 backdrop-blur-[3px] lg:hidden"
              onClick={() => setIsMobileSidebarOpen(false)}
              aria-hidden="true"
            />
            <div className="drawer-panel fixed inset-y-0 left-0 z-40 lg:hidden">
              <HRSidebar
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
          <HRSidebar
            fullName={fullName}
            username={username}
            profileImage={profileImage}
          />
        </div>

        <div className="flex min-w-0 flex-col overflow-hidden bg-[linear-gradient(180deg,#f4f8f5_0%,#eaf1eb_48%,#dde9df_100%)]">
          <HRNavbar
            firstName={firstName}
            department={department}
            profileImage={profileImage}
            pageEyebrow={pageEyebrow}
            pageTitle={pageTitle}
            onOpenSidebar={() => setIsMobileSidebarOpen(true)}
          />
          <div className="relative min-h-0 min-w-0 flex-1 overflow-y-auto">
            <div className="relative">{children}</div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default HRLayout;
