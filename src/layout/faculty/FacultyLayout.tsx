import { useState, type ReactNode } from 'react';
import FacultyNavbar from './Navbar';
import FacultySidebar from './Sidebar';

type FacultyLayoutProps = {
  firstName: string;
  fullName: string;
  department: string;
  username: string;
  profileImage?: string | null;
  pageEyebrow?: string;
  pageTitle: string;
  children: ReactNode;
};

function FacultyLayout({
  firstName,
  fullName,
  department,
  username,
  profileImage,
  pageEyebrow,
  pageTitle,
  children,
}: FacultyLayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <main className="h-screen overflow-hidden bg-[#b6c2cf] text-slate-900">
      <div className="relative grid h-full lg:grid-cols-[248px_1fr]">
        {isMobileSidebarOpen ? (
          <>
            <div
              className="drawer-overlay absolute inset-0 z-30 bg-[#142535]/46 backdrop-blur-[3px] lg:hidden"
              onClick={() => setIsMobileSidebarOpen(false)}
              aria-hidden="true"
            />
            <div className="drawer-panel fixed inset-y-0 left-0 z-40 lg:hidden">
              <FacultySidebar
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
          <FacultySidebar
            fullName={fullName}
            username={username}
            profileImage={profileImage}
          />
        </div>

        <div className="flex min-w-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_18%),radial-gradient(circle_at_top_right,rgba(74,111,161,0.12),transparent_24%),linear-gradient(180deg,#aebccc_0%,#9fafc0_46%,#90a2b6_100%)]">
          <FacultyNavbar
            firstName={firstName}
            department={department}
            profileImage={profileImage}
            pageEyebrow={pageEyebrow}
            pageTitle={pageTitle}
            onOpenSidebar={() => setIsMobileSidebarOpen(true)}
          />
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</div>
        </div>
      </div>
    </main>
  );
}

export default FacultyLayout;
