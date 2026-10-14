import { Component, inject } from '@angular/core';

import { formatoFecha } from '../../core/formato';
import { Ausencia, AusenciasService } from '../../shared/services/ausencias';
import { ConfigDetalle } from '../formularios/formulario-config';
import { FormularioDetalle } from '../formularios/formulario-detalle';

const siNo = (v: string | null) => (v === 'SI' ? 'Sí' : v === 'NO' ? 'No' : '—');

/** Detalle del formato E-PL-FO-13 (Ausencia de transacciones en efectivo). */
@Component({
  selector: 'app-ausencia-detalle',
  imports: [FormularioDetalle],
  template: `<app-formulario-detalle [config]="config" [api]="api" />`,
})
export class AusenciaDetalle {
  readonly api = inject(AusenciasService);

  readonly config: ConfigDetalle<Ausencia> = {
    titulo: (a) => `Ausencia de transacciones ${a.consecutivo}`,
    subtitulo: 'Formato E-PL-FO-13',
    ruta: '/ausencias',
    id: (a) => a.id_ausencia,
    sustantivo: 'reporte de ausencia',
    femenino: false,
    observacionRevision: (a) => a.observacion_revision,
    secciones: [
      {
        titulo: 'Datos generales',
        columnas: 2,
        campos: [
          { etiqueta: 'Entidad / Institución', valor: (a) => a.entidad || '—' },
          { etiqueta: 'Área / proceso', valor: (a) => a.area_proceso || '—' },
          { etiqueta: 'Responsable del proceso', valor: (a) => a.declarante_nombre || '—' },
          { etiqueta: 'Cargo', valor: (a) => a.declarante_cargo || '—' },
          { etiqueta: 'Teléfono', valor: (a) => a.declarante_telefono || '—' },
          { etiqueta: 'Correo electrónico', valor: (a) => a.declarante_correo || '—' },
        ],
      },
      {
        titulo: 'Periodo reportado',
        columnas: 3,
        campos: [
          { etiqueta: 'Desde', valor: (a) => formatoFecha(a.periodo_desde) },
          { etiqueta: 'Hasta', valor: (a) => formatoFecha(a.periodo_hasta) },
          { etiqueta: 'Fecha de elaboración', valor: (a) => formatoFecha(a.fecha_elaboracion) },
        ],
      },
      {
        titulo: 'Declaración y verificación',
        columnas: 2,
        campos: [
          {
            etiqueta: 'Declaración certificada',
            valor: (a) => (a.declaracion === 'SI' ? 'Sí, el responsable certificó la declaración' : '—'),
            completo: true,
          },
          { etiqueta: '¿El área maneja caja menor o recaudo en efectivo?', valor: (a) => siNo(a.manejo_caja) },
          { etiqueta: '¿Se recibieron pagos en efectivo?', valor: (a) => siNo(a.recibio_efectivo) },
          {
            etiqueta: '¿Se presentaron intentos de pago en efectivo rechazados?',
            valor: (a) => siNo(a.intento_pago),
          },
          {
            etiqueta: 'Observaciones',
            valor: (a) => a.observaciones || 'Sin observaciones',
            completo: true,
            multilinea: true,
          },
        ],
      },
    ],
  };
}
