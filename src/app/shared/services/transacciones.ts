import { Injectable } from '@angular/core';

import { FormularioApi, FormularioBase } from './formulario-api';

export interface Transaccion extends FormularioBase {
  id_transaccion: number;
  fecha_operacion: string;
  actividad_economica: string | null;
  valor: number;
  origen_fondos: string | null;
  destino_fondos: string | null;
  descripcion: string | null;
  observacion_revision: string | null;
}

export interface TransaccionEntrada {
  id_declarante: number;
  fecha_operacion: string; // AAAA-MM-DD
  actividad_economica?: string | null;
  valor: number;
  origen_fondos?: string | null;
  destino_fondos?: string | null;
  descripcion?: string | null;
}

@Injectable({ providedIn: 'root' })
export class TransaccionesService extends FormularioApi<Transaccion, TransaccionEntrada> {
  constructor() {
    super('transacciones');
  }
}
