import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatPrice } from '../lib/utils';
import Reveal from '../components/Reveal';
import ReservationModal from '../components/ReservationModal';

const IMG = {
  hero: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=1800&q=80',
  historia: 'https://images.unsplash.com/photo-1613514785940-daed07799d9b?auto=format&fit=crop&w=900&q=80',
  pastor: 'https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?auto=format&fit=crop&w=700&q=80',
  gringa: 'https://images.unsplash.com/photo-1618040996337-56904b7850b9?auto=format&fit=crop&w=700&q=80',
  aguas: 'https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=700&q=80',
  volcan: 'https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?auto=format&fit=crop&w=700&q=80',
  queso: 'https://images.unsplash.com/photo-1534352956036-cd81e27dd615?auto=format&fit=crop&w=700&q=80',
  torta: 'https://images.unsplash.com/photo-1628191010210-a59de33e5941?auto=format&fit=crop&w=700&q=80',
  interior: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1800&q=80'
};

const favoritos = [
  { img: IMG.pastor, name: 'Tacos al Pastor', price: 25, desc: 'Marinados en adobo de la casa, con piña, cebolla y cilantro fresco.' },
  { img: IMG.gringa, name: 'Gringa', price: 50, desc: 'Tortilla de harina dorada con queso fundido y pastor al carbón.' },
  { img: IMG.aguas, name: 'Aguas Frescas', price: 15, desc: 'Preparadas al día con fruta natural: horchata, jamaica y mango.' },
  { img: IMG.volcan, name: 'Volcán de Pastor', price: 35, desc: 'Tostada crujiente con queso gratinado y pastor doradito.' },
  { img: IMG.queso, name: 'Queso Fundido', price: 35, desc: 'Derretido al carbón, para taquear con tortillas recién hechas.' },
  { img: IMG.torta, name: 'Torta de Pastor', price: 55, desc: 'Telera dorada con pastor, quesillo, aguacate y frijoles.' }
];

const testimonios = [
  { name: 'Ana G.', role: 'Clienta', text: 'Los mejores tacos al pastor que he probado fuera de la ciudad. La salsa de molcajete es increíble.' },
  { name: 'Carlos M.', role: 'Cliente', text: 'Pido seguido a domicilio y siempre llega calientito y en tiempo. El volcán de pastor es mi favorito.' },
  { name: 'María L.', role: 'Clienta', text: 'El ambiente es súper familiar, los niños aman las gringas. Vamos cada fin de semana.' },
  { name: 'Pedro R.', role: 'Cliente', text: 'La atención del equipo es excelente. Te hacen sentir como en casa desde que entras.' },
  { name: 'Lupita S.', role: 'Mesera', text: 'Trabajar aquí es increíble. El ambiente entre compañeros es muy padre y la gente que viene es súmamente amable.' },
  { name: 'Toño H.', role: 'Cocinero', text: 'Aprendí el oficio aquí. Donde más se respeta la receta tradicional es en esta cocina, bien orgulloso.' },
  { name: 'Sofía E.', role: 'Clienta', text: 'Las aguas frescas son de lo mejor, se nota que son naturales. La de horchata con coco es mi perdición.' },
  { name: 'Jorge A.', role: 'Cliente', text: 'Llegué recomendado y ya llevo un año viniendo. La calidad nunca baja, eso se agradece.' },
  { name: 'Diana P.', role: 'Repartidora', text: 'La mejor chamba que he tenido. Buen ambiente, buenas propinas y el equipo siempre al tiro.' }
];

function TestimoniosCarousel() {
  const trackRef = useRef(null);
  const indexRef = useRef(0);
  const pausedRef = useRef(false);
  const [index, setIndex] = useState(0);

  const goTo = (i) => {
    const track = trackRef.current;
    if (!track || !track.children.length) return;
    const n = track.children.length;
    const target = ((i % n) + n) % n;
    const slide = track.children[target];
    track.scrollTo({ left: slide.offsetLeft, behavior: 'smooth' });
  };

  const handleScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    let best = 0, bestDist = Infinity;
    Array.from(track.children).forEach((child, i) => {
      const d = Math.abs(child.offsetLeft - track.scrollLeft);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    indexRef.current = best;
    setIndex(best);
  };

  useEffect(() => {
    const id = setInterval(() => {
      const track = trackRef.current;
      if (!track || pausedRef.current) return;
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;
      goTo(atEnd ? 0 : indexRef.current + 1);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
      onTouchStart={() => { pausedRef.current = true; }}
    >
      <div ref={trackRef} onScroll={handleScroll} className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar -mx-3 pb-2">
        {testimonios.map((t, i) => (
          <div key={i} className="snap-start shrink-0 basis-full sm:basis-1/2 lg:basis-1/3 px-3">
            <div className={`bg-white rounded-2xl p-6 shadow-md border h-full ${t.role === 'Mesera' || t.role === 'Cocinero' || t.role === 'Repartidora' ? 'border-brand-300' : 'border-ink-100'}`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white ${t.role === 'Mesera' || t.role === 'Cocinero' || t.role === 'Repartidora' ? 'bg-brand-500' : 'bg-ink-400'}`}>
                  {t.name.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-sm text-ink-900">{t.name}</div>
                  <div className="text-xs flex items-center gap-1">
                    {t.role === 'Mesera' || t.role === 'Cocinero' || t.role === 'Repartidora' ? '👨‍🍳' : '⭐'} <span className={t.role === 'Mesera' || t.role === 'Cocinero' || t.role === 'Repartidora' ? 'text-brand-600 font-semibold' : 'text-ink-400'}>{t.role}</span>
                  </div>
                </div>
              </div>
              <p className="text-ink-500 text-sm leading-relaxed italic">"{t.text}"</p>
              <div className="mt-4 flex gap-0.5 text-brand-400 text-xs">
                {'★'.repeat(5)}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-2 mt-6">
        {testimonios.map((_, i) => (
          <button key={i} onClick={() => goTo(i)} aria-label={`Testimonio ${i + 1}`}
            className={`h-2.5 rounded-full transition-all duration-300 ${i === index ? 'w-8 bg-brand-500' : 'w-2.5 bg-ink-300 hover:bg-brand-300'}`} />
        ))}
      </div>
    </div>
  );
}

function FavoritosCarousel({ items }) {
  const trackRef = useRef(null);
  const indexRef = useRef(0);
  const pausedRef = useRef(false);
  const [index, setIndex] = useState(0);

  const prefersReduced = () =>
    typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const goTo = (i) => {
    const track = trackRef.current;
    if (!track || !track.children.length) return;
    const n = track.children.length;
    const target = ((i % n) + n) % n;
    const slide = track.children[target];
    track.scrollTo({ left: slide.offsetLeft, behavior: prefersReduced() ? 'auto' : 'smooth' });
  };

  const handleScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    let best = 0, bestDist = Infinity;
    Array.from(track.children).forEach((child, i) => {
      const d = Math.abs(child.offsetLeft - track.scrollLeft);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    indexRef.current = best;
    setIndex(best);
  };

  useEffect(() => {
    if (prefersReduced()) return;
    const id = setInterval(() => {
      const track = trackRef.current;
      if (!track || pausedRef.current) return;
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;
      goTo(atEnd ? 0 : indexRef.current + 1);
    }, 4500);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="relative"
      role="region"
      aria-label="Platillos estrella"
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
      onTouchStart={() => { pausedRef.current = true; }}
    >
      <div ref={trackRef} onScroll={handleScroll} className="relative flex overflow-x-auto snap-x snap-mandatory no-scrollbar -mx-3 pb-2">
        {items.map(fav => (
          <div key={fav.name} className="snap-start shrink-0 basis-full sm:basis-1/2 lg:basis-1/3 px-3">
            <div className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-1.5 transition duration-300 group h-full">
              <div className="h-48 overflow-hidden bg-ink-100">
                <img src={fav.img} alt={fav.name} className="w-full h-full object-cover group-hover:scale-110 group-hover:rotate-1 transition duration-700" />
              </div>
              <div className="p-5">
                <div className="flex items-baseline justify-between gap-2 mb-2">
                  <h3 className="font-display text-xl font-bold text-ink-900">{fav.name}</h3>
                  <span className="text-brand-600 font-extrabold">{formatPrice(fav.price)}</span>
                </div>
                <p className="text-sm text-ink-400 leading-relaxed">{fav.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => goTo(indexRef.current - 1)} aria-label="Platillo anterior"
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 lg:-translate-x-5 w-11 h-11 rounded-full bg-white text-brand-600 shadow-lg hover:bg-brand-500 hover:text-white transition flex items-center justify-center text-2xl leading-none z-10">
        ‹
      </button>
      <button onClick={() => goTo(indexRef.current + 1)} aria-label="Platillo siguiente"
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 lg:translate-x-5 w-11 h-11 rounded-full bg-white text-brand-600 shadow-lg hover:bg-brand-500 hover:text-white transition flex items-center justify-center text-2xl leading-none z-10">
        ›
      </button>

      <div className="flex justify-center gap-2 mt-6">
        {items.map((fav, i) => (
          <button key={fav.name} onClick={() => goTo(i)} aria-label={`Ir a ${fav.name}`}
            className={`h-2.5 rounded-full transition-all duration-300 ${i === index ? 'w-8 bg-brand-500' : 'w-2.5 bg-brand-200 hover:bg-brand-300'}`} />
        ))}
      </div>
    </div>
  );
}

// Borde zigzag estilo papel picado entre secciones
function Zigzag({ fill, className = '' }) {
  const w = 1440, h = 16, seg = 40;
  let d = `M0 ${h}`;
  for (let x = 0; x < w; x += seg) d += ` L${x + seg / 2} 0 L${x + seg} ${h}`;
  d += ' Z';
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true" className={`block w-full h-4 ${className}`}>
      <path d={d} fill={fill} />
    </svg>
  );
}

function SectionLabel({ children, light }) {
  return (
    <p className={`flex items-center gap-3 text-xs font-bold uppercase tracking-[0.3em] mb-4 ${light ? 'text-brand-300' : 'text-brand-600'}`}>
      <span className={`h-px w-8 ${light ? 'bg-brand-300' : 'bg-brand-500'}`} />
      {children}
      <span className={`h-px w-8 ${light ? 'bg-brand-300' : 'bg-brand-500'}`} />
    </p>
  );
}

export default function Home() {
  const [reserving, setReserving] = useState(false);

  return (
    <div className="bg-cream-50">
      {/* Hero */}
      <section className="relative bg-ink-900 overflow-hidden">
        <img src={IMG.hero} alt="Tacos artesanales" className="absolute inset-0 w-full h-full object-cover opacity-50 animate-kenburns" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-ink-950/20" />
        <div className="relative max-w-7xl mx-auto px-4 py-28 lg:py-40">
          <Reveal>
            <SectionLabel light>Taquería Artesanal</SectionLabel>
          </Reveal>
          <Reveal delay={150}>
            <h1 className="font-display text-5xl lg:text-7xl font-extrabold text-cream-50 leading-tight max-w-3xl">
              El Sabor de la Tradición
            </h1>
          </Reveal>
          <Reveal delay={300}>
            <p className="mt-6 text-lg text-cream-100/90 max-w-xl">
              Tacos al pastor, suadero y carnitas hechos al momento, con tortillas a mano y salsas de molcajete.
            </p>
          </Reveal>
          <Reveal delay={450}>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/menu" className="bg-brand-500 text-white px-8 py-3 rounded font-bold uppercase tracking-widest text-sm hover:bg-brand-600 hover:scale-105 transition">Ver Menú</Link>
              <Link to="/local-order" className="bg-white/10 text-cream-50 px-8 py-3 rounded font-bold uppercase tracking-widest text-sm hover:bg-white/20 transition">Pedir desde el Local 🏠</Link>
              <Link to="/register" className="border border-cream-100/40 text-cream-50 px-8 py-3 rounded font-bold uppercase tracking-widest text-sm hover:bg-cream-100/10 transition">Ordenar a Domicilio</Link>
              <button onClick={() => setReserving(true)} className="border border-cream-100/40 text-cream-50 px-8 py-3 rounded font-bold uppercase tracking-widest text-sm hover:bg-cream-100/10 transition">Reservar Mesa 🍽️</button>
            </div>
          </Reveal>
        </div>
        <Zigzag fill="#FBF7EF" className="absolute bottom-0 left-0" />
      </section>

      {/* Historia */}
      <section className="max-w-7xl mx-auto px-4 py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <Reveal variant="reveal-left">
            <div className="relative group">
              <div className="absolute -inset-3 bg-brand-500/10 rounded-2xl rotate-2 group-hover:rotate-1 transition duration-500" />
              <img src={IMG.historia} alt="Tacos tradicionales" className="relative rounded-2xl shadow-xl w-full h-80 lg:h-[26rem] object-cover group-hover:scale-[1.01] transition duration-500" />
            </div>
          </Reveal>
          <Reveal variant="reveal-right" delay={150}>
            <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.3em] mb-3 text-brand-600">
              <span className="h-px w-8 bg-brand-500" />
              Nuestra Historia
            </p>
            <h2 className="font-display text-3xl lg:text-4xl font-extrabold text-ink-900 leading-snug mb-5">
              Recetas Tradicionales y Tortillas Hechas a Mano
            </h2>
            <p className="text-ink-500 leading-relaxed mb-6">
              En La Gaonerita cocinamos como se hacía antes: el trompo al carbón, la masa nixtamalizada cada mañana y las salsas
              martajadas en molcajete. Cada platillo lleva el tiempo y el cariño que la buena comida merece.
            </p>
            <blockquote className="relative border-l-4 border-brand-500 bg-white rounded-r-xl p-5 pl-10 shadow-sm">
              <span aria-hidden="true" className="absolute top-0 left-2 font-display text-6xl leading-none text-brand-200 select-none">"</span>
              <p className="font-display text-lg text-ink-700 italic">"Cada taco lleva el sazón de tres generaciones."</p>
            </blockquote>
          </Reveal>
        </div>
      </section>

      {/* Misión y Visión */}
      <section className="max-w-7xl mx-auto px-4 py-20 lg:py-28">
        <Reveal>
          <div className="text-center mb-14">
            <p className="text-brand-600 text-xs font-bold uppercase tracking-[0.3em] mb-3">Nuestro Propósito</p>
            <h2 className="font-display text-3xl lg:text-4xl font-extrabold text-ink-900">Misión y Visión</h2>
          </div>
        </Reveal>
        <div className="grid md:grid-cols-2 gap-8">
          <Reveal variant="reveal-left">
            <div className="bg-white rounded-2xl p-8 shadow-md border border-ink-100 h-full">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-2xl font-bold font-display uppercase text-brand-600 mb-4">Misión</h3>
              <p className="text-ink-600 leading-relaxed">
                Ofrecer una experiencia gastronómica auténtica y de calidad, preservando el sabor tradicional
                de la taquería mexicana con ingredientes frescos, atención cálida y un ambiente que haga sentir
                a cada comensal como en casa.
              </p>
            </div>
          </Reveal>
          <Reveal variant="reveal-right" delay={150}>
            <div className="bg-white rounded-2xl p-8 shadow-md border border-ink-100 h-full">
              <div className="text-4xl mb-4">🔭</div>
              <h3 className="text-2xl font-bold font-display uppercase text-brand-600 mb-4">Visión</h3>
              <p className="text-ink-600 leading-relaxed">
                Ser la taquería de referencia en la comunidad, reconocida por la excelencia de nuestros
                tacos, la innovación en nuestro menú y el compromiso con nuestros clientes y colaboradores,
                expandiendo nuestro legado a más mesas cada día.
              </p>
            </div>
          </Reveal>
        </div>
        <Reveal delay={300}>
          <div className="mt-8 bg-brand-50 border border-brand-200 rounded-2xl p-6 text-center">
            <p className="text-brand-700 font-semibold">🌮 Más que tacos, una tradición — cada taco lleva el sazón de tres generaciones.</p>
          </div>
        </Reveal>
      </section>

      {/* Favoritos */}
      <section className="bg-cream-100 relative">
        <Zigzag fill="#FBF7EF" className="absolute top-0 left-0" />
        <div className="max-w-7xl mx-auto px-4 py-20 pt-24">
          <Reveal>
            <div className="text-center mb-12">
              <p className="text-brand-600 text-xs font-bold uppercase tracking-[0.3em] mb-3">Platillos Estrella</p>
              <h2 className="font-display text-3xl lg:text-4xl font-extrabold text-brand-600">Los Favoritos de la Casa</h2>
              <div className="flex items-center justify-center gap-3 mt-4" aria-hidden="true">
                <span className="h-px w-12 bg-brand-400" />
                <span className="text-brand-500">✦</span>
                <span className="h-px w-12 bg-brand-400" />
              </div>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <FavoritosCarousel items={favoritos} />
          </Reveal>
          <Reveal delay={300}>
            <div className="text-center mt-10">
              <Link to="/menu" className="inline-block bg-brand-500 text-white px-8 py-3 rounded font-bold uppercase tracking-widest text-sm hover:bg-brand-600 hover:scale-105 transition">Ver Menú Completo</Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Testimonios */}
      <section className="max-w-7xl mx-auto px-4 py-20 lg:py-28">
        <Reveal>
          <div className="text-center mb-14">
            <p className="text-brand-600 text-xs font-bold uppercase tracking-[0.3em] mb-3">Opiniones</p>
            <h2 className="font-display text-3xl lg:text-4xl font-extrabold text-ink-900">Lo Que Dicen de Nosotros</h2>
          </div>
        </Reveal>
        <Reveal delay={150}>
          <TestimoniosCarousel />
        </Reveal>
      </section>

      {/* Visítanos */}
      <section className="relative bg-ink-900 overflow-hidden">
        <img src={IMG.interior} alt="Interior del restaurante" className="absolute inset-0 w-full h-full object-cover opacity-30 animate-kenburns" />
        <div className="absolute inset-0 bg-ink-950/40" />
        <Zigzag fill="#F5EDDF" className="absolute top-0 left-0 z-10" />
        <div className="relative max-w-7xl mx-auto px-4 py-20 lg:py-28">
          <Reveal variant="reveal-left">
            <div className="bg-cream-50 rounded-2xl shadow-2xl p-8 max-w-md">
              <h2 className="font-display text-2xl lg:text-3xl font-extrabold text-ink-900 mb-6">Visítanos en el Barrio</h2>
              <div className="space-y-5">
                <div className="flex gap-4">
                  <span className="text-brand-500 text-xl">📍</span>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-ink-400 mb-1">Dirección</div>
                    <div className="text-ink-700">Av. Revolución #123, Col. Centro</div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <span className="text-brand-500 text-xl">🕐</span>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-ink-400 mb-1">Horario</div>
                    <div className="text-ink-700">Lunes a Domingo</div>
                    <div className="text-ink-700">12:00 – 23:00</div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <span className="text-brand-500 text-xl">📞</span>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-ink-400 mb-1">Teléfono</div>
                    <div className="text-ink-700">(55) 1234-5678</div>
                  </div>
                </div>
                </div>
              </div>
              <Link to="/local-order" className="mt-6 inline-block bg-brand-500 text-white w-full text-center py-3 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-brand-600 transition">Pedir desde tu Mesa 🏠</Link>
              <button onClick={() => setReserving(true)} className="mt-3 inline-block w-full text-center py-3 rounded-xl font-bold uppercase tracking-widest text-sm border-2 border-brand-500 text-brand-600 hover:bg-brand-50 transition">Reservar Mesa 🍽️</button>
            </Reveal>
          </div>
        </section>

      {reserving && <ReservationModal onClose={() => setReserving(false)} />}
    </div>
  );
}
