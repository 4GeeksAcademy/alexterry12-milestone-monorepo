export function Footer() {
  return (
    <footer className="bg-navy py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 text-center sm:flex-row sm:px-6">
        <p className="text-sm text-white/60">
          © 2025 TrackFlow. All rights reserved.
        </p>
        <a
          href="https://linkedin.com/company/trackflow"
          className="text-sm text-white/60 hover:text-amber"
          target="_blank"
          rel="noopener noreferrer"
        >
          LinkedIn
        </a>
      </div>
    </footer>
  );
}
