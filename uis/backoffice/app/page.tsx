export default function Home() {
  return (
    <section className="mx-auto max-w-3xl">
      <p className="font-mono text-xs tracking-widest text-accent uppercase">
        Overview
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        Welcome to TrackFlow Backoffice
      </h1>
      <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted">
        This is the internal dashboard entry point. Modules for operations,
        people, and settings will land here later — no business logic is wired
        up yet.
      </p>
      <div className="mt-10 h-px w-full bg-line" />
      <p className="mt-6 font-mono text-sm text-muted">
        Status: scaffold ready · awaiting module integration
      </p>
    </section>
  );
}
