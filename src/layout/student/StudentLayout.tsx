import { useState, type ReactNode } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

type StudentLayoutProps = {
  firstName: string;
  fullName: string;
  section: string;
  username: string;
  profileImage?: string | null;
  children: ReactNode;
};

function StudentLayout({
  firstName,
  fullName,
  section,
  username,
  profileImage,
  children,
}: StudentLayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <main className="h-screen overflow-hidden bg-[#b8c8da] text-slate-900">
      <div className="relative grid h-full lg:grid-cols-[248px_1fr]">
        {isMobileSidebarOpen ? (
          <>
            <div
              className="drawer-overlay absolute inset-0 z-30 bg-[#0c1e35]/52 backdrop-blur-[3px] lg:hidden"
              onClick={() => setIsMobileSidebarOpen(false)}
              aria-hidden="true"
            />
            <div className="drawer-panel fixed inset-y-0 left-0 z-40 lg:hidden">
              <Sidebar
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
          <Sidebar fullName={fullName} username={username} profileImage={profileImage} />
        </div>
        <div className="flex min-w-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(53,112,171,0.14),transparent_23%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_18%),linear-gradient(180deg,#b8c8da_0%,#aebfd3_46%,#a5b8cc_100%)]">
          <Navbar
            firstName={firstName}
            section={section}
            profileImage={profileImage}
            onOpenSidebar={() => setIsMobileSidebarOpen(true)}
          />
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</div>
        </div>
      </div>
    </main>
  );
}

export default StudentLayout;
