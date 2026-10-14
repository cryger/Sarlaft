import { Injectable } from '@angular/core';

import { FormularioApi, FormularioBase } from './formulario-api';

export type SiNo = 'SI' | 'NO';

/** Formato E-PL-FO-13: Ausencia de transacciones en efectivo. */
export interface Ausencia extends FormularioBase {
  id_ausencia: number;

  // Datos generales (cargo, teléfono y correo del responsable salen del declarante)
  entidad: string | null;
  area_proceso: string | null;

  // Periodo reportado
  periodo_desde: string;
  periodo_hasta: string;
  fecha_elaboracion: string | null;

  // Declaración y verificación
  declaracion: string | null;
  manejo_caja: SiNo;
  recibio_efectivo: SiNo;
  intento_pago: SiNo;
  observaciones: string | null;

  observacion_revision: string | null;
}

export interface AusenciaEntrada {
  entidad: string;
  area_proceso: string;
  id_declarante: number; // Responsable del proceso
  periodo_desde: string; // AAAA-MM-DD
  periodo_hasta: string;
  fecha_elaboracion: string;
  declaracion: SiNo;
  manejo_caja: SiNo;
  recibio_efectivo: SiNo;
  intento_pago: SiNo;
  observaciones?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AusenciasService extends FormularioApi<Ausencia, AusenciaEntrada> {
  constructor() {
    super('ausencias');
  }
}
