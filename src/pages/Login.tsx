import { Link } from 'react-router-dom';

const quickStats = [
  { label: 'Year founded', value: '1993' },
  { label: 'Programs offered', value: '20+' },
  { label: 'Graduates reached', value: '50K+' },
];

const updates = [
  'Access schedules, advisories, and learning services from one secure portal.',
  'Built for students, faculty, and administrative teams across every campus touchpoint.',
  'Inspired by the official Informatics Philippines identity, with cleaner login-first focus.',
];

function Login() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_24%),linear-gradient(135deg,_#091a3d_0%,_#0a2458_40%,_#103784_100%)] text-slate-50">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:88px_88px] opacity-25" />
      <div className="absolute left-[-8rem] top-[-7rem] h-72 w-72 rounded-full bg-amber-300/20 blur-3xl" />
      <div className="absolute bottom-[-10rem] right-[-4rem] h-96 w-96 rounded-full bg-sky-300/15 blur-3xl" />

      <div className="relative grid min-h-screen lg:grid-cols-[1.2fr_0.8fr]">
        <section className="hidden min-h-[56svh] flex-col justify-between px-10 py-8 lg:flex lg:px-14 lg:py-12">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/95 p-2 shadow-[0_10px_30px_rgba(8,20,48,0.28)] sm:h-16 sm:w-16">
                <img
                  src="/images/logo.png"
                  alt="Informatics Philippines logo"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div>
                <p className="text-lg font-bold uppercase tracking-[0.16em] text-white sm:text-xl sm:tracking-[0.18em]">
                  Informatics
                </p>
                <p className="text-xs text-blue-100/80 sm:text-sm">
                  Philippines Student Portal
                </p>
              </div>
            </div>
            <div className="hidden rounded-full border border-amber-300/35 bg-amber-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-amber-100 sm:block">
              Enrollment open
            </div>
          </div>

          <div className="max-w-xl py-8 sm:py-12 lg:py-16">
            <p className="mb-3 text-[11px] uppercase tracking-[0.32em] text-amber-100/75 sm:mb-4 sm:text-xs sm:tracking-[0.4em]">
              Master the digital age
            </p>
            <h1 className="font-display text-4xl leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Start your journey with a portal built for modern learning.
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-slate-300 sm:mt-6 sm:text-lg sm:leading-7">
              A more focused sign-in experience inspired by the official
              Informatics Philippines website, with stronger hierarchy, cleaner
              access points, and campus-ready clarity.
            </p>

            <div className="mt-8 hidden gap-4 sm:grid sm:grid-cols-3">
              {quickStats.map((stat) => (
                <div
                  key={stat.label}
                  className="border-t border-white/15 pt-4"
                >
                  <p className="text-2xl font-semibold text-white">{stat.value}</p>
                  <p className="mt-1 text-sm uppercase tracking-[0.18em] text-slate-300">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden gap-3 text-sm text-slate-200/90 sm:grid sm:max-w-xl">
            {updates.map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 border-t border-white/10 py-3"
              >
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-amber-300" />
                <p>{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-5 py-6 sm:min-h-0 sm:px-10 sm:py-8 lg:px-14">
          <div className="w-full max-w-md rounded-[1.75rem] border border-white/15 bg-white/94 p-5 text-slate-900 shadow-[0_30px_80px_rgba(6,24,58,0.35)] backdrop-blur sm:rounded-[2rem] sm:p-8">
            <div className="mb-6 flex items-center gap-3 border-b border-slate-200 pb-5 lg:hidden">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_8px_24px_rgba(8,20,48,0.12)]">
                <img
                  src="/images/logo.png"
                  alt="Informatics Philippines logo"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-950">
                  Informatics
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.24em] text-[#0d4aa6]/70">
                  Master the digital age
                </p>
              </div>
            </div>

            <div className="mb-6 sm:mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#0d4aa6]/75">
                Secure access
              </p>
              <h2 className="mt-2 font-display text-3xl leading-tight text-slate-950 sm:mt-3 sm:text-4xl">
                Welcome back
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 sm:mt-3">
                Sign in with your school credentials to continue to classes,
                student services, and administrative tools.
              </p>
            </div>

            <form className="space-y-4 sm:space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Email address
                </span>
                <input
                  type="email"
                  placeholder="student@informatics.edu"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 outline-none transition duration-200 placeholder:text-slate-400 focus:border-[#0d4aa6] focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <label className="block">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-slate-700">Password</span>
                  <a
                    href="#"
                    className="text-sm font-medium text-[#0d4aa6] transition hover:text-[#0a2f6f]"
                  >
                    Forgot password?
                  </a>
                </div>
                <input
                  type="password"
                  placeholder="Enter your password"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 outline-none transition duration-200 placeholder:text-slate-400 focus:border-[#0d4aa6] focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <div className="flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-[#0d4aa6] focus:ring-blue-500"
                  />
                  <span>Keep this device trusted</span>
                </label>
                <span>Protected sign-in</span>
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl bg-[#0d4aa6] px-4 py-3.5 text-base font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-[#0a3b83] focus:outline-none focus:ring-4 focus:ring-blue-200"
              >
                Sign in to portal
              </button>
            </form>

            <div className="mt-6 grid gap-4 border-t border-slate-200 pt-4 sm:mt-8 sm:pt-5">
              <div className="flex items-center justify-between gap-4 text-sm text-slate-500">
                <p>Need admin onboarding?</p>
                <a
                  href="#"
                  className="font-medium text-slate-900 transition hover:text-[#0d4aa6]"
                >
                  Request access
                </a>
              </div>
              <div className="flex items-center justify-between gap-4 text-sm text-slate-500">
                <p>New student applicant?</p>
                <Link
                  to="/register"
                  className="font-medium text-slate-900 transition hover:text-[#0d4aa6]"
                >
                  Create account
                </Link>
              </div>
              <div className="hidden rounded-2xl bg-slate-950 px-4 py-4 text-sm text-slate-200 sm:block">
                <p className="font-semibold text-white">Student Services</p>
                <p className="mt-1 text-slate-300">
                  Need help logging in? Contact your campus registrar or portal
                  administrator.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Login;
