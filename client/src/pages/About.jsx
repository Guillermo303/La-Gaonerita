export default function About() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-black font-display uppercase tracking-tight text-ink-900 mb-3">Sobre Nosotros</h1>
        <div className="w-16 h-1 bg-brand-500 mx-auto" />
      </div>

      <div className="grid md:grid-cols-2 gap-12 mb-16">
        <div className="bg-white rounded-2xl p-8 shadow-md border border-ink-100">
          <div className="text-4xl mb-4">🎯</div>
          <h2 className="text-2xl font-bold font-display uppercase text-brand-600 mb-4">Misión</h2>
          <p className="text-ink-600 leading-relaxed">
            Ofrecer una experiencia gastronómica auténtica y de calidad, preservando el sabor tradicional 
            de la taquería mexicana con ingredientes frescos, atención cálida y un ambiente que haga sentir 
            a cada comensal como en casa.
          </p>
        </div>
        <div className="bg-white rounded-2xl p-8 shadow-md border border-ink-100">
          <div className="text-4xl mb-4">🔭</div>
          <h2 className="text-2xl font-bold font-display uppercase text-brand-600 mb-4">Visión</h2>
          <p className="text-ink-600 leading-relaxed">
            Ser la taquería de referencia en la comunidad, reconocida por la excelencia de nuestros 
            tacos, la innovación en nuestro menú y el compromiso con nuestros clientes y colaboradores, 
            expandiendo nuestro legado a más mesas cada día.
          </p>
        </div>
      </div>

      <div className="bg-brand-50 border border-brand-200 rounded-2xl p-8 text-center">
        <div className="text-3xl mb-3">🌮</div>
        <h3 className="text-lg font-bold text-brand-700 mb-2">Más que tacos, una tradición</h3>
        <p className="text-brand-600 text-sm max-w-lg mx-auto">
          Cada taco que servimos lleva décadas de recetas familiares, ingredientes seleccionados 
          y el cariño de quienes creemos que la buena comida une a las personas.
        </p>
      </div>
    </div>
  );
}
