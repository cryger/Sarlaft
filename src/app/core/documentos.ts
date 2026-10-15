/** Datos del encabezado oficial de cada formato (se muestran en el PDF). */
export interface DocumentoOficial {
  codigo: string;
  version: string;
  titulo: string;
  /** Fecha de aprobación del formato en el sistema de calidad (dd/mm/aaaa). Si falta, no se muestra. */
  fechaAprobacion?: string;
}

/** Clave: la ruta del módulo. */
export const DOCUMENTOS: Record<string, DocumentoOficial | undefined> = {
  '/transacciones': {
    codigo: 'E-PL-FO-15',
    version: '2.0',
    titulo: 'Transacción individual en efectivo',
  },
  '/ausencias': {
    codigo: 'E-PL-FO-13',
    version: '1.0',
    titulo: 'Ausencia de transacciones en efectivo',
  },
  '/reportes-ros': {
    codigo: 'E-PL-FO-14',
    version: '2.0',
    titulo: 'Reporte de operación intentada, inusual o sospechosa (ROS)',
  },
  '/transacciones-multiples': {
    codigo: 'E-PL-FO-16',
    version: '2.0',
    titulo: 'Transacciones múltiples en efectivo',
  },
  '/vinculacion-terceros': {
    codigo: 'E-PL-FO-09',
    version: '1.0',
    titulo: 'Formato único de vinculación y actualización de terceros',
    fechaAprobacion: '20/12/2024',
  },
};
