import { Link, Navigate, useNavigate } from 'react-router-dom';

type StoredUser = {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string;
  email: string;
  username: string;
  section: string;
  birthdate: string;
  address: string;
  contactNumber: string;
};

function Dashboard() {
  const navigate = useNavigate();
  const storedUser = getStoredUser();

  if (!storedUser) {
    return <Navigate to="/login" replace />;
  }

  const fullName = [storedUser.firstName, storedUser.middleName, storedUser.lastName]
    .filter(Boolean)
    .join(' ');

  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(145deg,_#1f3a5f_0%,_#234d77_55%,_#2c5f92_100%)] px-5 py-8 text-slate-900 sm:px-8">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:84px_84px] opacity-30" />
      <div className="absolute left-[-8rem] top-[-6rem] h-72 w-72 rounded-full bg-[#3498db]/18 blur-3xl" />
      <div className="absolute bottom-[-8rem] right-[-3rem] h-80 w-80 rounded-full bg-[#5dade2]/14 blur-3xl" />

      <div className="relative mx-auto max-w-6xl">
        <section className="overflow-hidden rounded-[1.9rem] border border-white/45 bg-[#ecf0f1] shadow-[0_30px_80px_rgba(16,33,53,0.28)]">
          <header className="flex flex-col gap-5 border-b border-[#d6dde2] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#d6dde2] bg-white p-2 shadow-[0_8px_18px_rgba(44,62,80,0.08)]">
                <img
                  src="/images/logo.png"
                  alt="Informatics Philippines logo"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div>
                <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-slate-950">
                  Informatics
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-[#3498db]">
                  Student dashboard
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/register"
                className="rounded-full border border-[#bdc3c7] px-4 py-2 text-[13px] font-medium text-[#34495e] transition hover:border-[#3498db] hover:text-[#3498db]"
              >
                Register another user
              </Link>
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('informatics-user');
                  navigate('/login', { replace: true });
                }}
                className="rounded-full bg-[#3498db] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#2d89c6]"
              >
                Log out
              </button>
            </div>
          </header>

          <div className="grid gap-6 px-5 py-6 sm:px-8 lg:grid-cols-[1.1fr_0.9fr]">
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#3498db]">
                Welcome
              </p>
              <h1 className="mt-3 font-display text-[2.3rem] leading-[1] text-slate-950">
                {storedUser.firstName}, your portal is ready.
              </h1>
              <p className="mt-3 max-w-2xl text-[14px] leading-6 text-[#5d6d7e]">
                This is your first dashboard screen after login. It can grow into
                schedules, announcements, grades, and campus tools, but for now it
                confirms that authentication is working end to end.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <article className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-[0_14px_30px_rgba(44,62,80,0.08)]">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#7f8c8d]">
                    Username
                  </p>
                  <p className="mt-3 text-lg font-semibold text-slate-950">
                    {storedUser.username}
                  </p>
                </article>
                <article className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-[0_14px_30px_rgba(44,62,80,0.08)]">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#7f8c8d]">
                    Section
                  </p>
                  <p className="mt-3 text-lg font-semibold text-slate-950">
                    {storedUser.section}
                  </p>
                </article>
                <article className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-[0_14px_30px_rgba(44,62,80,0.08)]">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#7f8c8d]">
                    Birthdate
                  </p>
                  <p className="mt-3 text-lg font-semibold text-slate-950">
                    {formatBirthdate(storedUser.birthdate)}
                  </p>
                </article>
              </div>
            </section>

            <aside className="space-y-4">
              <article className="rounded-3xl border border-white/70 bg-white/82 p-5 shadow-[0_14px_30px_rgba(44,62,80,0.08)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#3498db]">
                  Student profile
                </p>
                <dl className="mt-4 space-y-4 text-sm">
                  <div>
                    <dt className="text-[#7f8c8d]">Full name</dt>
                    <dd className="mt-1 font-medium text-[#2c3e50]">{fullName}</dd>
                  </div>
                  <div>
                    <dt className="text-[#7f8c8d]">Email</dt>
                    <dd className="mt-1 font-medium text-[#2c3e50]">{storedUser.email}</dd>
                  </div>
                  <div>
                    <dt className="text-[#7f8c8d]">Contact number</dt>
                    <dd className="mt-1 font-medium text-[#2c3e50]">
                      {storedUser.contactNumber}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#7f8c8d]">Address</dt>
                    <dd className="mt-1 font-medium text-[#2c3e50]">{storedUser.address}</dd>
                  </div>
                </dl>
              </article>

              <article className="rounded-3xl border border-[#d6dde2] bg-[linear-gradient(180deg,_rgba(255,255,255,0.72)_0%,_rgba(237,243,248,0.82)_100%)] p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#3498db]">
                  Next step
                </p>
                <p className="mt-3 text-sm leading-6 text-[#5d6d7e]">
                  If you want, I can turn this into a fuller student dashboard next
                  with cards for announcements, enrolled subjects, and quick actions.
                </p>
              </article>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

function getStoredUser() {
  const rawValue = localStorage.getItem('informatics-user');

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as StoredUser;
  } catch {
    localStorage.removeItem('informatics-user');
    return null;
  }
}

function formatBirthdate(value: string) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

export default Dashboard;
