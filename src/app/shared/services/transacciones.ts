import { Injectable } from '@angular/core';

import { FormularioApi, FormularioBase } from './formulario-api';

/** Formato E-PL-FO-15: se diligencia por cada transacción igual o superior a este valor. */
export const UMBRAL_EFECTIVO = 5_000_000;

export type TipoOperacion = 'Pago' | 'Abono' | 'Devolución' | 'Otro';

export interface Transaccion extends FormularioBase {
  id_transaccion: number;

  // Información general
  area_responsable: string | null;
  periodo_reporte: string | null; // AAAA-MM
  fecha_elaboracion: string | null;

  // Datos de la operación
  fecha_operacion: string;
  tipo_operacion: TipoOperacion | null;
  tipo_operacion_otro: string | null;
  valor: number;
  numero_factura: string | null;
  concepto_pago: string | null;

  // Datos de quien realiza el pago (el resto sale del declarante)
  barrio: string | null;
  actividad_economica: string | null;
  relacion_paciente: string | null;
  origen_fondos: string | null;
  senales_alerta: string | null;

  // Autorización de datos personales
  titular_nombre: string | null;
  titular_documento: string | null;
  autoriza_datos: string | null;

  observacion_revision: string | null;

  // Campos del formato anterior (solo lectura)
  destino_fondos: string | null;
  descripcion: string | null;
}

export interface TransaccionEntrada {
  area_responsable: string;
  periodo_reporte: string; // AAAA-MM
  fecha_elaboracion: string; // AAAA-MM-DD
  fecha_operacion: string;
  tipo_operacion: TipoOperacion;
  tipo_operacion_otro?: string | null;
  valor: number;
  numero_factura: string;
  concepto_pago: string;
  id_declarante: number;
  barrio: string;
  actividad_economica: string;
  relacion_paciente: string;
  origen_fondos: string;
  senales_alerta?: string | null;
  titular_nombre: string;
  titular_documento: string;
  autoriza_datos: 'SI' | 'NO';
}

@Injectable({ providedIn: 'root' })
export class TransaccionesService extends FormularioApi<Transaccion, TransaccionEntrada> {
  constructor() {
    super('transacciones');
  }
}
