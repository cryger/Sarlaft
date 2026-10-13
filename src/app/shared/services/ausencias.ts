import { Injectable } from '@angular/core';

import { FormularioApi, FormularioBase } from './formulario-api';

export type SiNo = 'SI' | 'NO';

export interface Ausencia extends FormularioBase {
  id_ausencia: number;
  periodo_desde: string;
  periodo_hasta: string;
  manejo_caja: SiNo;
  recibio_efectivo: SiNo;
  intento_pago: SiNo;
  observaciones: string | null;
  nombre_verifica: string | null;
  pdf_generado: string | null;
  observacion_revision: string | null;
}

export interface AusenciaEntrada {
  id_declarante: number;
  periodo_desde: string; // AAAA-MM-DD
  periodo_hasta: string;
  manejo_caja: SiNo;
  recibio_efectivo: SiNo;
  intento_pago: SiNo;
  observaciones?: string | null;
  nombre_verifica?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AusenciasService extends FormularioApi<Ausencia, AusenciaEntrada> {
  constructor() {
    super('ausencias');
  }
}
