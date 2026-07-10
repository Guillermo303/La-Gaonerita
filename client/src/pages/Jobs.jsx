import { Link } from 'react-router-dom';

const vacantes = [
  {
    title: 'Cocinero / Taquero',
    type: 'Tiempo completo',
    schedule: 'Lun–Dom (rotativo)',
    desc: 'Preparación de platillos siguiendo recetas tradicionales. Experiencia en cocina mexicana deseable.',
    reqs: ['Experiencia mínima 1 año en cocina', 'Disponibilidad de horario', 'Trabajo en equipo']
  },
  {
    title: 'Mesero',
    type: 'Tiempo completo / Medio tiempo',
    schedule: 'Lun–Dom (rotativo)',
    desc: 'Atención al cliente en mesa, toma de órdenes y servicio eficiente y amable.',
    reqs: ['Experiencia en restaurante', 'Buena presentación', 'Actitud de servicio']
  },
  {
    title: 'Repartidor',
    type: 'Medio tiempo',
    schedule: 'Vie–Dom 18:00–23:00',
    desc: 'Entrega de pedidos a domicilio en moto. Zona Centro y alrededores.',
    reqs: ['Moto propia y licencia vigente', 'Conocimiento de la zona', 'Smartphone con datos']
  }
];

export default function Jobs() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-black font-display uppercase tracking-tight text-ink-900 mb-3">Únete al Equipo</h1>
        <p className="text-ink-400 max-w-md mx-auto">
          Somos una familia que busca talento apasionado por la cocina y el servicio. 
          Si te gusta trabajar en un ambiente dinámico y divertido, ¡te esperamos!
        </p>
        <div className="w-16 h-1 bg-brand-500 mx-auto mt-4" />
      </div>

      <div className="space-y-6">
        {vacantes.map((v, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-md border border-ink-100 hover:shadow-lg transition">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
              <div>
                <h2 className="text-xl font-bold text-ink-900">{v.title}</h2>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs bg-brand-100 text-brand-700 font-semibold px-2 py-0.5 rounded-full">{v.type}</span>
                  <span className="text-xs bg-ink-100 text-ink-600 font-semibold px-2 py-0.5 rounded-full">{v.schedule}</span>
                </div>
              </div>
            </div>
            <p className="text-ink-500 text-sm mb-4">{v.desc}</p>
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-widest text-ink-400 mb-1.5">Requisitos</p>
              <ul className="space-y-0.5">
                {v.reqs.map((r, j) => (
                  <li key={j} className="text-sm text-ink-600 flex items-center gap-2">
                    <span className="text-brand-500">•</span> {r}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-brand-50 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-brand-700">¿Te interesa?</p>
                <p className="text-xs text-brand-500">Envíanos tu CV y cuéntanos de ti</p>
              </div>
              <a href="mailto:jobs@laganerita.com?subject=Vacante%20-%20Solicitud" className="bg-brand-500 text-white px-5 py-2 rounded-lg font-bold text-sm hover:bg-brand-600 transition whitespace-nowrap">Aplicar</a>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 bg-ink-900 text-cream-50 rounded-2xl p-8 text-center">
        <div className="text-3xl mb-3">💬</div>
        <h3 className="text-xl font-bold mb-2">¿No encuentras la vacante ideal?</h3>
        <p className="text-ink-300 text-sm mb-4 max-w-md mx-auto">
          Siempre estamos abiertos a conocer talento nuevo. Mándanos tu CV y te contactaremos 
          cuando tengamos una oportunidad para ti.
        </p>
        <a href="mailto:jobs@laganerita.com" className="bg-brand-500 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-brand-600 transition inline-block">Enviar CV</a>
      </div>
    </div>
  );
}
