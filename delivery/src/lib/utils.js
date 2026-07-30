export function formatPrice(price) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(price);
}

export const statusColors = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  preparando: 'bg-blue-100 text-blue-800',
  listo: 'bg-green-100 text-green-800',
  completado: 'bg-gray-100 text-gray-800',
  cancelado: 'bg-red-100 text-red-800'
};

export const statusLabels = {
  pendiente: 'Pendiente',
  preparando: 'Preparando',
  listo: 'Listo',
  completado: 'Completado',
  cancelado: 'Cancelado'
};

export const typeLabels = {
  local: 'Local',
  domicilio: 'Domicilio'
};
