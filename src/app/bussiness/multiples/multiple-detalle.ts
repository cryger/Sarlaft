import { Component, inject } from '@angular/core';

import { nombreTipoIdentificacion } from '../../core/constantes';
import { formatoFecha, formatoMoneda, formatoPeriodo } from '../../core/formato';
import {
  DetalleMultiple,
  TransaccionMultiple,
  TransaccionesMultiplesService,
  UMBRAL_MULTIPLES,
} from '../../shared/services/transacciones-multiples';
import { ConfigDetalle } from '../formularios/formulario-config';
import { FormularioDetalle } from '../formularios/formulario-detalle';

/** Detalle del formato E-PL-FO-16 (Transacciones múltiples en efectivo). */
@Component({
  selector: 'app-multiple-detalle',
  imports: [FormularioDetalle],
  template: `<app-formulario-detalle [config]="config" [api]="api" />`,
})
export class MultipleDetalle {
  readonly api = inject(TransaccionesMultiplesService);

  readonly config: ConfigDetalle<TransaccionMultiple> = {
    titulo: (m) => `Transacciones múltiples ${m.consecutivo}`,
    subtitulo: 'Formato E-PL-FO-16',
    ruta: '/transacciones-multiples',
    id: (m) => m.id_multiple,
    sustantivo: 'reporte',
    femenino: false,
    observacionRevision: (m) => m.observacion_revision,
    secciones: [
      {
        titulo: 'Información general del reportante',
        columnas: 3,
        campos: [
          { etiqueta: 'Área responsable', valor: (m) => m.area_responsable || '—' },
          { etiqueta: 'Periodo de reporte', valor: (m) => formatoPeriodo(m.periodo_reporte) },
          { etiqueta: 'Fecha de elaboración', valor: (m) => formatoFecha(m.fecha_elaboracion) },
        ],
      },
      {
        titulo: 'Tercero',
        columnas: 3,
        campos: [
          { etiqueta: 'Nombre', valor: (m) => m.tercero_nombre || '—' },
          { etiqueta: 'Tipo de documento', valor: (m) => nombreTipoIdentificacion(m.tercero_tipo_id) },
          { etiqueta: 'Número de identificación', valor: (m) => m.tercero_numero_id || '—' },
        ],
      },
      {
        titulo: 'Totales',
        columnas: 3,
        campos: [
          { etiqueta: 'Total acumulado del tercero', valor: (m) => formatoMoneda(m.total_acumulado), destacado: true },
          { etiqueta: 'Transacciones registradas', valor: (m) => String(m.num_transacciones) },
          {
            etiqueta: '¿Supera el umbral de reporte?',
            valor: (m) =>
              m.supera_umbral === 'SI'
                ? `Sí (umbral de ${formatoMoneda(UMBRAL_MULTIPLES)})`
                : `No (umbral de ${formatoMoneda(UMBRAL_MULTIPLES)})`,
          },
        ],
      },
      {
        titulo: 'Datos de cierre',
        columnas: 2,
        campos: [
          { etiqueta: 'Periodo acumulado', valor: (m) => m.periodo_acumulado || '—' },
          { etiqueta: 'Nombre de quien diligencia el formato', valor: (m) => m.nombre_diligencia || '—' },
        ],
      },
    ],
    tablas: [
      {
        titulo: 'Transacciones del tercero',
        filas: (m) => m.detalles ?? [],
        columnas: [
          { titulo: 'Fecha', valor: (d: DetalleMultiple) => formatoFecha(d.fecha) },
          { titulo: 'Nombre del pagador', valor: (d: DetalleMultiple) => d.nombre_pagador },
          { titulo: 'Factura / recibo', valor: (d: DetalleMultiple) => d.numero_factura },
          { titulo: 'Concepto', valor: (d: DetalleMultiple) => d.concepto },
          { titulo: 'Valor en efectivo', valor: (d: DetalleMultiple) => formatoMoneda(d.valor), derecha: true },
          { titulo: 'Observaciones / alertas', valor: (d: DetalleMultiple) => d.observaciones || '—' },
        ],
      },
    ],
  };
}
