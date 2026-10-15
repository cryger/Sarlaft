import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../../core/api.config';
import { RespuestaApi } from '../../core/api.types';

export interface ItemNotificacion {
  /** "Transacciones en efectivo", "Vinculación de terceros"... */
  tipo: string;
  /** Ruta del módulo: "/transacciones" */
  ruta: string;
  id: number;
  consecutivo: string;
  /** AAAA-MM-DD HH:MM:SS (para el administrador, cuándo se registró; para el gestor, cuándo se revisó) */
  fecha: string;
  /** Hace cuántos segundos ocurrió, calculado por la base de datos (no depende de la zona horaria del navegador). */
  segundos: number;

  // Administrador
  alerta_pep?: boolean;

  // Gestor
  estado?: 'Aprobado' | 'Rechazado';
  observacion?: string | null;
}

export interface Notificaciones {
  rol: 'Administrador' | 'Gestor';
  /** Solo el administrador: total de formularios pendientes de revisión. */
  pendientes_total: number | null;
  items: ItemNotificacion[];
}

/**
 * Notificaciones de la campana.
 *  - Administrador: formularios pendientes de revisión.
 *  - Gestor: sus formularios que ya fueron aprobados o rechazados (últimos 30 días).
 */
@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private readonly http = inject(HttpClient);

  obtener(): Observable<RespuestaApi<Notificaciones>> {
    return this.http.get<RespuestaApi<Notificaciones>>(`${API_URL}/notificaciones`);
  }
}
