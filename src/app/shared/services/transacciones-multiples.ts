import { Injectable } from '@angular/core';

import { FormularioApi, FormularioBase } from './formulario-api';

/**
 * Formato E-PL-FO-16: transacciones múltiples. Anexo 2 de la UIAF (Circular 009 de 2016, Supersalud):
 * las de una misma persona en el mes que en su conjunto igualen o superen este valor se reportan.
 */
export const UMBRAL_MULTIPLES = 25_000_000;

export type PeriodoAcumulado = 'Día' | 'Mes';

/** Una fila del reporte: una transacción del mismo tercero. */
export interface DetalleMultiple {
  id_detalle?: number;
  orden?: number;
  fecha: string; // AAAA-MM-DD
  nombre_pagador: string;
  tipo_identificacion: string;
  numero_identificacion: string;
  numero_factura: string;
  concepto: string;
  valor: number;
  observaciones: string | null;
}

export interface TransaccionMultiple extends FormularioBase {
  id_multiple: number;

  // Información general del reportante
  area_responsable: string | null;
  periodo_reporte: string | null; // AAAA-MM
  fecha_elaboracion: string | null;

  // Datos de cierre
  periodo_acumulado: string | null;
  nombre_diligencia: string | null;

  // Los calcula la API a partir de las filas
  tercero_nombre: string | null;
  tercero_tipo_id: string | null;
  tercero_numero_id: string | null;
  total_acumulado: number;
  num_transacciones: number;
  supera_umbral: string | null;

  observacion_revision: string | null;

  /** Solo viene al pedir un registro, no en la lista. */
  detalles?: DetalleMultiple[];
}

export interface TransaccionMultipleEntrada {
  area_responsable: string;
  periodo_reporte: string; // AAAA-MM
  fecha_elaboracion: string; // AAAA-MM-DD
  periodo_acumulado: PeriodoAcumulado;
  nombre_diligencia: string;
  detalles: DetalleMultiple[];
}

@Injectable({ providedIn: 'root' })
export class TransaccionesMultiplesService extends FormularioApi<TransaccionMultiple, TransaccionMultipleEntrada> {
  constructor() {
    super('transacciones-multiples');
  }
}
