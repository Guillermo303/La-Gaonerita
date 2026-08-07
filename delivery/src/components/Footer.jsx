export default function Footer() {
  return (
    <footer className="bg-ink-900 text-cream-100">
      <div className="serape-line" aria-hidden="true" />
      <div className="max-w-7xl mx-auto px-4 py-10 text-center">
        <div className="font-display text-lg font-extrabold uppercase tracking-wider text-brand-500 mb-2">La Gaonerita</div>
        <p className="text-sm text-ink-300">(55) 1234-5678 · Vie – Dom · 20:00 – 23:00</p>
        <div className="border-t border-cream-100/10 mt-6 pt-4 text-xs text-ink-400">
          © {new Date().getFullYear()} La Gaonerita. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
