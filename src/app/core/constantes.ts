/** Entidad que aparece por defecto en los formatos SARLAFT. */
export const ENTIDAD = 'E.S.E. Hospital San José del Guaviare';

/** Tipos de documento del formato E-PL-FO-14 (se guarda el código). */
export const TIPOS_IDENTIFICACION = [
  { valor: 'CC', etiqueta: 'Cédula de Ciudadanía' },
  { valor: 'CE', etiqueta: 'Cédula de Extranjería' },
  { valor: 'TI', etiqueta: 'Tarjeta de Identidad' },
  { valor: 'RC', etiqueta: 'Registro Civil' },
  { valor: 'PA', etiqueta: 'Pasaporte' },
  { valor: 'NIT', etiqueta: 'NIT' },
  { valor: 'PEP', etiqueta: 'Permiso Especial de Permanencia' },
  { valor: 'PPT', etiqueta: 'Permiso por Protección Temporal' },
  { valor: 'Otro', etiqueta: 'Otro' },
];

/** Código -> nombre completo (si el valor no está en la lista, se muestra tal cual). */
export function nombreTipoIdentificacion(valor: string | null | undefined): string {
  if (!valor) return '—';
  return TIPOS_IDENTIFICACION.find((t) => t.valor === valor)?.etiqueta ?? valor;
}
