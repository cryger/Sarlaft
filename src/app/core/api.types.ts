/** Forma de todas las respuestas de la API. */
export interface RespuestaApi<T> {
  success: boolean;
  message?: string;
  data: T;
  meta?: { total: number; limit: number; offset: number };
  errors?: Record<string, string>;
}

/** Saca el mensaje que envía la API (o uno por defecto si no hubo conexión). */
export function mensajeApi(error: unknown, porDefecto: string): string {
  const e = error as { status?: number; error?: { message?: string } };
  if (e?.status === 0) {
    return 'No fue posible conectarse con el servidor.';
  }
  return e?.error?.message ?? porDefecto;
}
