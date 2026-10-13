import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../../core/api.config';
import { RespuestaApi } from '../../core/api.types';
import { Filtros } from '../../core/recurso-api';

export interface MovimientoHistorial {
  id_historial: number;
  modulo: string;
  registro: number;
  accion: string;
  usuario: number;
  fecha: string;
  ip: string | null;
  observaciones: string | null;
  usuario_nombre: string | null;
  usuario_login: string | null;
}

/** Solo lectura y solo para administradores. Filtros: modulo, usuario, accion, desde, hasta, q. */
@Injectable({ providedIn: 'root' })
export class HistorialService {
  private readonly http = inject(HttpClient);

  listar(filtros: Filtros = {}): Observable<RespuestaApi<MovimientoHistorial[]>> {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor !== undefined && valor !== null && valor !== '') {
        params = params.set(clave, String(valor));
      }
    }
    return this.http.get<RespuestaApi<MovimientoHistorial[]>>(`${API_URL}/historial`, { params });
  }
}
