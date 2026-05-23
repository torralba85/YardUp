export default function Home() {
  return (
    <main className="home">
      <section className="hero">
        <div className="eyebrow">YardUp is getting ready</div>

        <div className="intro">
          <h1>Yard help, lined up faster.</h1>
          <p>
            YardUp connects homeowners with local help for mowing, cleanup,
            hauling, and seasonal outdoor projects.
          </p>
        </div>

        <div className="steps">
          <div className="card">
            <h2>Post the job</h2>
            <p>Share what your yard needs and where you are.</p>
          </div>
          <div className="card">
            <h2>Compare local help</h2>
            <p>Review nearby providers and simple estimates.</p>
          </div>
          <div className="card">
            <h2>Get it done</h2>
            <p>Book the work and keep your weekends open.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
