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
    <main className="h-screen overflow-hidden bg-[#dbe6f1] text-slate-900">
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

        <div className="flex min-w-0 flex-col overflow-hidden bg-[linear-gradient(180deg,#eef4fa_0%,#e3ebf4_48%,#d9e4ef_100%)]">
          <FacultyNavbar
            firstName={firstName}
            department={department}
            profileImage={profileImage}
            pageEyebrow={pageEyebrow}
            pageTitle={pageTitle}
            onOpenSidebar={() => setIsMobileSidebarOpen(true)}
          />
          <div className="relative min-h-0 min-w-0 flex-1 overflow-y-auto">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(89,144,201,0.12),transparent_18%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.55),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(118,150,184,0.1),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0)_34%)]"
            />
            <div className="relative">{children}</div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default FacultyLayout;
