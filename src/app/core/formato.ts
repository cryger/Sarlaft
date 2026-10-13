const moneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** 1500000 -> $ 1.500.000 */
export function formatoMoneda(valor: number | null | undefined): string {
  return valor === null || valor === undefined ? '—' : moneda.format(valor);
}

/** 2026-10-07 (o 2026-10-07 15:30:00) -> 07/10/2026 */
export function formatoFecha(valor: string | null | undefined): string {
  if (!valor) return '—';
  const [a, m, d] = valor.slice(0, 10).split('-');
  return a && m && d ? `${d}/${m}/${a}` : valor;
}

/** 2026-10-07 15:30:00 -> 07/10/2026 15:30 */
export function formatoFechaHora(valor: string | null | undefined): string {
  if (!valor) return '—';
  const hora = valor.slice(11, 16);
  return hora ? `${formatoFecha(valor)} ${hora}` : formatoFecha(valor);
}

/** Fecha de hoy en formato AAAA-MM-DD (hora local del navegador). */
export function hoy(): string {
  const d = new Date();
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

/** Colores de la etiqueta de estado de los formularios. */
export const ESTILOS_ESTADO: Record<string, string> = {
  Pendiente: 'from-orange-600 to-orange-400',
  Aprobado: 'from-green-600 to-green-400',
  Rechazado: 'from-red-600 to-red-400',
};

/** Para buscar sin importar tildes ni mayúsculas. */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
