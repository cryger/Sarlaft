import { Injectable } from '@angular/core';

import { FormularioApi, FormularioBase } from './formulario-api';

export type TipoOperacionRos = 'Sospechosa' | 'Intentada' | 'Inusual';
export type TipoTercero = 'Usuario' | 'Proveedor' | 'Servidor' | 'Contratista';

/** Formato E-PL-FO-14: Operación intentada, inusual o sospechosa (ROS). */
export interface ReporteRos extends FormularioBase {
  id_ros: number;

  /** null = reporte anónimo */
  id_declarante: number;

  // Información del reporte
  fecha_reporte: string;
  tipo_operacion: string;
  area_involucrada: string | null;

  // Tercero involucrado
  nombre_tercero: string | null;
  tipo_tercero: string | null;
  tipo_identificacion: string | null;
  numero_identificacion: string | null;

  // Descripción, información financiera y análisis
  descripcion: string | null;
  valor_economico: number | null;
  indicios: string | null;
  relacion_operaciones: string | null;
  observaciones_adicionales: string | null;

  // Autorización de datos personales
  titular_nombre: string | null;
  titular_documento: string | null;
  autoriza_datos: string | null;

  observaciones_revision: string | null;
}

export interface ReporteRosEntrada {
  /** null = reporte anónimo */
  id_declarante: number | null;
  fecha_reporte: string; // AAAA-MM-DD
  tipo_operacion: TipoOperacionRos;
  area_involucrada: string;
  nombre_tercero: string;
  tipo_tercero: TipoTercero;
  tipo_identificacion: string;
  numero_identificacion: string;
  descripcion: string;
  valor_economico: number;
  indicios: string;
  relacion_operaciones?: string | null;
  observaciones_adicionales?: string | null;
  titular_nombre: string;
  titular_documento: string;
  autoriza_datos: 'SI' | 'NO';
}

@Injectable({ providedIn: 'root' })
export class ReportesRosService extends FormularioApi<ReporteRos, ReporteRosEntrada> {
  constructor() {
    super('reportes-ros');
  }
}
