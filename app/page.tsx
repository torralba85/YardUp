export default function Home() {
  return (
    <main className="min-h-screen bg-stone-950 px-6 py-16 text-white">
      <section className="mx-auto flex max-w-4xl flex-col gap-8">
        <div className="rounded-full border border-lime-300/30 bg-lime-300/10 px-4 py-2 text-sm font-medium text-lime-200 w-fit">
          YardUp is getting ready
        </div>

        <div className="space-y-5">
          <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
            Yard help, lined up faster.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-stone-300">
            YardUp connects homeowners with local help for mowing, cleanup,
            hauling, and seasonal outdoor projects.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="font-semibold">Post the job</h2>
            <p className="mt-2 text-sm text-stone-400">Share what your yard needs and where you are.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="font-semibold">Compare local help</h2>
            <p className="mt-2 text-sm text-stone-400">Review nearby providers and simple estimates.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="font-semibold">Get it done</h2>
            <p className="mt-2 text-sm text-stone-400">Book the work and keep your weekends open.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
