import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../../core/api.config';
import { RespuestaApi } from '../../core/api.types';

export interface ResumenFormulario {
  total: number;
  pendientes: number;
}

export interface ActividadReciente {
  tipo: string;
  consecutivo: string;
  fecha: string;
  estado: 'Pendiente' | 'Aprobado' | 'Rechazado';
}

export interface ResumenOperativo {
  etiqueta: string;
  valor: number;
  porcentaje: number;
}

export interface DashboardData {
  fecha_corte: string;
  indicadores: {
    declarantes: number;
    transacciones: ResumenFormulario;
    ausencias: ResumenFormulario;
    ros: ResumenFormulario;
  };
  actividad: ActividadReciente[];
  resumen: ResumenOperativo[];
  pendientes: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  obtener(): Observable<RespuestaApi<DashboardData>> {
    return this.http.get<RespuestaApi<DashboardData>>(`${API_URL}/dashboard`);
  }
}
