import { Link } from 'react-router-dom';

const roles = [
  {
    id: 'cliente',
    title: 'Quiero Ordenar',
    desc: 'Cliente',
    features: ['Ver el menú completo', 'Pedir a domicilio', 'Pedir desde el local', 'Seguir mis pedidos'],
    icon: '🌮',
    color: 'bg-brand-500 hover:bg-brand-600',
    border: 'border-brand-200 hover:border-brand-400',
    to: '/register?role=cliente'
  },
  {
    id: 'mesero',
    title: 'Trabajo Aquí',
    desc: 'Empleado',
    features: ['Tomar órdenes de clientes', 'Ver pedidos en tiempo real', 'Gestionar entregas', 'App instalable en tu teléfono'],
    icon: '👨‍🍳',
    color: 'bg-ink-800 hover:bg-ink-900',
    border: 'border-ink-300 hover:border-ink-500',
    to: '/register?role=mesero'
  }
];

export default function Join() {
  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full">
        <div className="text-center mb-12">
          <div className="text-5xl mb-4">🌮</div>
          <h1 className="font-display text-4xl lg:text-5xl font-extrabold text-ink-900 mb-3">La Gaonerita</h1>
          <p className="text-ink-400 text-lg">¿Qué deseas hacer?</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {roles.map(role => (
            <Link
              key={role.id}
              to={role.to}
              className={`group bg-white rounded-3xl border-2 ${role.border} shadow-lg p-8 text-center hover:shadow-2xl hover:-translate-y-1 transition-all duration-300`}
            >
              <div className="text-6xl mb-5 group-hover:scale-110 transition-transform duration-300">{role.icon}</div>
              <h2 className="font-display text-2xl font-extrabold text-ink-900 mb-1">{role.title}</h2>
              <p className="text-ink-400 text-sm mb-6">{role.desc}</p>
              <ul className="text-left space-y-2 mb-8">
                {role.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-ink-600">
                    <span className="text-brand-500">✓</span> {f}
                  </li>
                ))}
              </ul>
              <span className={`inline-block w-full ${role.color} text-white py-3 rounded-xl font-bold uppercase tracking-widest text-sm transition`}>
                Crear Cuenta
              </span>
            </Link>
          ))}
        </div>

        <p className="text-center mt-8 text-sm text-ink-400">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-brand-600 font-semibold hover:underline">Iniciar Sesión</Link>
        </p>
      </div>
    </div>
  );
}
