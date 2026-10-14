import { Injectable } from '@angular/core';

import { RecursoApi } from '../../core/recurso-api';

/** Una línea de la auditoría: quién hizo qué, sobre qué registro y cuándo. */
export interface RegistroHistorial {
  id_historial: number;
  modulo: string;
  /** id del registro afectado (en el módulo indicado) */
  registro: number;
  accion: string;
  usuario: number;
  /** AAAA-MM-DD HH:MM:SS */
  fecha: string;
  ip: string | null;
  observaciones: string | null;
  usuario_nombre: string | null;
  usuario_login: string | null;
}

/** Solo lectura y solo para administradores. */
@Injectable({ providedIn: 'root' })
export class HistorialService extends RecursoApi<RegistroHistorial, unknown> {
  constructor() {
    super('historial');
  }
}
