import { Injectable } from '@angular/core';

import { FormularioApi, FormularioBase } from './formulario-api';

export interface ReporteRos extends FormularioBase {
  id_ros: number;
  fecha_reporte: string;
  tipo_operacion: string;
  area_involucrada: string | null;
  nombre_tercero: string | null;
  tipo_tercero: string | null;
  tipo_identificacion: string | null;
  numero_identificacion: string | null;
  descripcion: string | null;
  valor_economico: number | null;
  indicios: string | null;
  relacion_operaciones: string | null;
  valor: number | null;
  observaciones: string | null;
  observaciones_adicionales: string | null;
  titular_nombre: string | null;
  titular_documento: string | null;
  autoriza_datos: string | null;
  observaciones_revision: string | null;
}

export interface ReporteRosEntrada {
  id_declarante: number;
  fecha_reporte: string; // AAAA-MM-DD
  tipo_operacion: string;
  descripcion: string;
  area_involucrada?: string | null;
  nombre_tercero?: string | null;
  tipo_tercero?: string | null;
  tipo_identificacion?: string | null;
  numero_identificacion?: string | null;
  valor_economico?: number | null;
  indicios?: string | null;
  relacion_operaciones?: string | null;
  valor?: number | null;
  observaciones?: string | null;
  observaciones_adicionales?: string | null;
  titular_nombre?: string | null;
  titular_documento?: string | null;
  autoriza_datos?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ReportesRosService extends FormularioApi<ReporteRos, ReporteRosEntrada> {
  constructor() {
    super('reportes-ros');
  }
}
