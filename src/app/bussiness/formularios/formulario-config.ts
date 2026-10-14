import { FormularioBase } from '../../shared/services/formulario-api';

// ----------------------------------------------------------------- lista

export interface ColumnaLista<T> {
  titulo: string;
  valor: (f: T) => string;
  /** Segunda línea, más pequeña, debajo del valor. */
  secundario?: (f: T) => string;
  derecha?: boolean;
  negrita?: boolean;
}

export interface ConfigLista<T extends FormularioBase> {
  titulo: string;
  ruta: string; // '/ausencias'
  id: (f: T) => number;
  buscarPlaceholder: string;
  nuevoTexto: string;
  vacioTitulo: string;
  vacioTexto: string;
  /** La primera columna siempre es el consecutivo; estas van después y antes del estado. */
  columnas: ColumnaLista<T>[];
}

// --------------------------------------------------------------- detalle

export interface CampoDetalle<T> {
  etiqueta: string;
  valor: (f: T) => string;
  /** Ocupa todo el ancho de la sección. */
  completo?: boolean;
  /** Valor grande y en negrita (por ejemplo un monto). */
  destacado?: boolean;
  /** Respeta los saltos de línea del texto. */
  multilinea?: boolean;
}

export interface SeccionDetalle<T> {
  titulo: string;
  columnas: 2 | 3;
  campos: CampoDetalle<T>[];
  ocultaSi?: (f: T) => boolean;
}

export interface ConfigDetalle<T extends FormularioBase> {
  titulo: (f: T) => string;
  subtitulo: string;
  ruta: string; // '/ausencias'
  id: (f: T) => number;
  /** Para los mensajes: "ausencia", "reporte". */
  sustantivo: string;
  femenino: boolean;
  /** Observación de la revisión (en ROS la columna tiene otro nombre). */
  observacionRevision: (f: T) => string | null;
  secciones: SeccionDetalle<T>[];
}
