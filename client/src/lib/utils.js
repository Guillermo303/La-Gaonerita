export function formatPrice(price) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(price);
}

// Zona horaria de la taqueria. Se fija explicita en cualquier fecha/hora
// calculada en el navegador para que no dependa del reloj/zona del
// dispositivo que la vea.
export const TIMEZONE = 'America/Mexico_City';

export const statusColors = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  preparando: 'bg-blue-100 text-blue-800',
  listo: 'bg-green-100 text-green-800',
  completado: 'bg-gray-100 text-gray-800',
  cancelado: 'bg-red-100 text-red-800'
};

export const statusLabels = {
  pendiente: 'Nuevo',
  preparando: 'En preparación',
  listo: 'Pedido terminado',
  completado: 'Enviado / Entregado',
  cancelado: 'Cancelado'
};

export const typeLabels = {
  local: 'Local',
  domicilio: 'Domicilio'
};
