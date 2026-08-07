export function formatPrice(price) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(price);
}

// Zona horaria de la taqueria. Se fija explicita en cualquier fecha/hora
// calculada en el navegador para que no dependa del reloj/zona del
// dispositivo que la vea.
export const TIMEZONE = 'America/Mexico_City';

export const typeLabels = {
  local: 'Local',
  domicilio: 'Domicilio'
};
