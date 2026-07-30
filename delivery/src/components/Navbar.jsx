export default function Navbar({ onReset }) {
  return (
    <nav className="bg-ink-900 text-cream-50 sticky top-0 z-50 shadow-lg shadow-ink-950/30">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <button onClick={onReset} className="shrink-0 hover:opacity-80 transition">
            <img src="/logo.jpeg" alt="La Gaonerita" className="h-10 w-auto" />
          </button>
          <span className="text-xs font-semibold uppercase tracking-widest text-cream-100/70">A Domicilio</span>
        </div>
      </div>
      <div className="serape-line" aria-hidden="true" />
    </nav>
  );
}
