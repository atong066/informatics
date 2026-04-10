import { Link } from 'react-router-dom';

const highlights = [
  'Submit your application details and create your student portal credentials in one step.',
  'Designed for incoming students exploring senior high school, college, and diploma pathways.',
  'Clean, mobile-friendly registration flow aligned with the Informatics identity.',
];

function Register() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_24%),linear-gradient(135deg,_#091a3d_0%,_#0a2458_40%,_#103784_100%)] text-slate-50">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:88px_88px] opacity-25" />
      <div className="absolute left-[-8rem] top-[-7rem] h-72 w-72 rounded-full bg-amber-300/20 blur-3xl" />
      <div className="absolute bottom-[-10rem] right-[-4rem] h-96 w-96 rounded-full bg-sky-300/15 blur-3xl" />

      <div className="relative grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden min-h-[56svh] flex-col justify-between px-10 py-8 lg:flex lg:px-14 lg:py-12">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/95 p-2 shadow-[0_10px_30px_rgba(8,20,48,0.28)]">
              <img
                src="/images/logo.png"
                alt="Informatics Philippines logo"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div>
              <p className="text-xl font-bold uppercase tracking-[0.18em] text-white">
                Informatics
              </p>
              <p className="text-sm text-blue-100/80">Philippines Admissions Portal</p>
            </div>
          </div>

          <div className="max-w-xl py-10">
            <p className="mb-4 text-xs uppercase tracking-[0.4em] text-amber-100/75">
              Enrollment open
            </p>
            <h1 className="font-display text-6xl leading-[0.94] tracking-tight text-white">
              Create your account and begin your application.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-7 text-slate-300">
              A streamlined registration experience for future Informatics students,
              built to feel clearer and more focused than a typical admissions form.
            </p>
          </div>

          <div className="grid gap-3 text-sm text-slate-200/90">
            {highlights.map((item) => (
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

        <section className="flex min-h-screen items-center justify-center px-5 py-6 sm:px-10 sm:py-8 lg:px-14">
          <div className="w-full max-w-lg rounded-[1.75rem] border border-white/15 bg-white/94 p-5 text-slate-900 shadow-[0_30px_80px_rgba(6,24,58,0.35)] backdrop-blur sm:rounded-[2rem] sm:p-8">
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
                  Enrollment open
                </p>
              </div>
            </div>

            <div className="mb-6 sm:mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#0d4aa6]/75">
                Student registration
              </p>
              <h2 className="mt-2 font-display text-3xl leading-tight text-slate-950 sm:mt-3 sm:text-4xl">
                Create your portal account
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 sm:mt-3">
                Register with your personal details to begin admissions, track your
                application, and access student services later on.
              </p>
            </div>

            <form className="space-y-4 sm:space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    First name
                  </span>
                  <input
                    type="text"
                    placeholder="Juan"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 outline-none transition duration-200 placeholder:text-slate-400 focus:border-[#0d4aa6] focus:ring-4 focus:ring-blue-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Last name
                  </span>
                  <input
                    type="text"
                    placeholder="Dela Cruz"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 outline-none transition duration-200 placeholder:text-slate-400 focus:border-[#0d4aa6] focus:ring-4 focus:ring-blue-100"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Email address
                </span>
                <input
                  type="email"
                  placeholder="applicant@email.com"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 outline-none transition duration-200 placeholder:text-slate-400 focus:border-[#0d4aa6] focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Mobile number
                  </span>
                  <input
                    type="tel"
                    placeholder="+63 9XX XXX XXXX"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 outline-none transition duration-200 placeholder:text-slate-400 focus:border-[#0d4aa6] focus:ring-4 focus:ring-blue-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Program interest
                  </span>
                  <select className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 outline-none transition duration-200 focus:border-[#0d4aa6] focus:ring-4 focus:ring-blue-100">
                    <option>Senior High School</option>
                    <option>Bachelor&apos;s Degree</option>
                    <option>Diploma Courses</option>
                    <option>Short Courses</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Password
                  </span>
                  <input
                    type="password"
                    placeholder="Create a password"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 outline-none transition duration-200 placeholder:text-slate-400 focus:border-[#0d4aa6] focus:ring-4 focus:ring-blue-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Confirm password
                  </span>
                  <input
                    type="password"
                    placeholder="Repeat password"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 outline-none transition duration-200 placeholder:text-slate-400 focus:border-[#0d4aa6] focus:ring-4 focus:ring-blue-100"
                  />
                </label>
              </div>

              <label className="flex items-start gap-3 text-sm text-slate-600">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-[#0d4aa6] focus:ring-blue-500"
                />
                <span>
                  I agree to the admissions process, account creation terms, and
                  future updates about my application.
                </span>
              </label>

              <button
                type="submit"
                className="w-full rounded-2xl bg-[#0d4aa6] px-4 py-3.5 text-base font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-[#0a3b83] focus:outline-none focus:ring-4 focus:ring-blue-200"
              >
                Create account
              </button>
            </form>

            <div className="mt-6 border-t border-slate-200 pt-4 sm:mt-8 sm:pt-5">
              <div className="flex items-center justify-between gap-4 text-sm text-slate-500">
                <p>Already have an account?</p>
                <Link
                  to="/login"
                  className="font-medium text-slate-900 transition hover:text-[#0d4aa6]"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Register;
