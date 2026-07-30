import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="bg-ink-900 text-cream-50 sticky top-0 z-50 shadow-lg shadow-ink-950/30">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="font-display text-xl font-extrabold uppercase tracking-wider text-brand-500 shrink-0">
            La Gaonerita
          </Link>
          <span className="text-xs font-semibold uppercase tracking-widest text-cream-100/70">A Domicilio</span>
        </div>
      </div>
      <div className="serape-line" aria-hidden="true" />
    </nav>
  );
}
