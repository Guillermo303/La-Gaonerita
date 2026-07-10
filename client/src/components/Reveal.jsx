import { useEffect, useRef, useState } from 'react';

export default function Reveal({ children, delay = 0, variant = '', className = '' }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let gotCallback = false;
    const obs = new IntersectionObserver(([entry]) => {
      gotCallback = true;
      if (entry.isIntersecting) {
        setVisible(true);
        obs.disconnect();
      }
    }, { threshold: 0.15 });
    obs.observe(el);
    // Si el navegador nunca entrega el callback (renderer oculto/limitado),
    // mostrar el contenido de todos modos para que nada quede invisible.
    const fallback = setTimeout(() => { if (!gotCallback) setVisible(true); }, 2000);
    return () => { obs.disconnect(); clearTimeout(fallback); };
  }, []);

  return (
    <div ref={ref} className={`reveal ${variant} ${className} ${visible ? 'is-visible' : ''}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  );
}
