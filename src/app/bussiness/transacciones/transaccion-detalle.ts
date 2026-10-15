import { Component, inject } from '@angular/core';

import { formatoFecha, formatoMoneda, formatoPeriodo } from '../../core/formato';
import { Transaccion, TransaccionesService } from '../../shared/services/transacciones';
import { ConfigDetalle } from '../formularios/formulario-config';
import { FormularioDetalle } from '../formularios/formulario-detalle';

/** Detalle del formato E-PL-FO-15 (Transacción individual en efectivo). */
@Component({
  selector: 'app-transaccion-detalle',
  imports: [FormularioDetalle],
  template: `<app-formulario-detalle [config]="config" [api]="api" />`,
})
export class TransaccionDetalle {
  readonly api = inject(TransaccionesService);

  readonly config: ConfigDetalle<Transaccion> = {
    titulo: (t) => `Transacción ${t.consecutivo}`,
    subtitulo: 'Formato E-PL-FO-15 · Transacción individual en efectivo',
    ruta: '/transacciones',
    id: (t) => t.id_transaccion,
    sustantivo: 'transacción',
    femenino: true,
    observacionRevision: (t) => t.observacion_revision,
    secciones: [
      {
        titulo: 'Información general',
        columnas: 3,
        campos: [
          { etiqueta: 'Área responsable', valor: (t) => t.area_responsable || '—' },
          { etiqueta: 'Periodo de reporte', valor: (t) => formatoPeriodo(t.periodo_reporte) },
          { etiqueta: 'Fecha de elaboración', valor: (t) => formatoFecha(t.fecha_elaboracion) },
        ],
      },
      {
        titulo: 'Datos de la operación',
        columnas: 3,
        campos: [
          { etiqueta: 'Consecutivo interno', valor: (t) => t.consecutivo },
          { etiqueta: 'Fecha de la operación', valor: (t) => formatoFecha(t.fecha_operacion) },
          {
            etiqueta: 'Tipo de operación',
            valor: (t) =>
              `${t.tipo_operacion || '—'}${t.tipo_operacion === 'Otro' && t.tipo_operacion_otro ? ': ' + t.tipo_operacion_otro : ''}`,
          },
          { etiqueta: 'Valor en efectivo', valor: (t) => formatoMoneda(t.valor), destacado: true },
          { etiqueta: 'Número de factura / recibo', valor: (t) => t.numero_factura || '—' },
          { etiqueta: 'Concepto del pago', valor: (t) => t.concepto_pago || '—', completo: true, multilinea: true },
        ],
      },
      {
        titulo: 'Datos de quien realiza el pago',
        columnas: 3,
        campos: [
          { etiqueta: 'Nombre completo o razón social', valor: (t) => t.declarante_nombre || '—' },
          {
            etiqueta: 'Tipo y número de identificación',
            valor: (t) => `${t.declarante_tipo_documento ?? ''} ${t.declarante_documento || '—'}`.trim(),
          },
          { etiqueta: 'Teléfono', valor: (t) => t.declarante_telefono || '—' },
          { etiqueta: 'Correo electrónico', valor: (t) => t.declarante_correo || '—' },
          { etiqueta: 'Dirección', valor: (t) => t.declarante_direccion || '—' },
          { etiqueta: 'Barrio', valor: (t) => t.barrio || '—' },
          { etiqueta: 'Actividad económica', valor: (t) => t.actividad_economica || '—' },
          { etiqueta: 'Relación con el paciente / usuario', valor: (t) => t.relacion_paciente || '—' },
          { etiqueta: 'Origen de fondos declarados', valor: (t) => t.origen_fondos || '—', completo: true, multilinea: true },
          {
            etiqueta: 'Señales de alerta',
            valor: (t) => t.senales_alerta || 'Sin señales de alerta reportadas',
            completo: true,
            multilinea: true,
          },
        ],
      },
      {
        titulo: 'Autorización de datos personales',
        columnas: 3,
        campos: [
          {
            etiqueta: 'Autorización',
            valor: (t) => (t.autoriza_datos === 'SI' ? 'Autorizada' : t.autoriza_datos === 'NO' ? 'No autorizada' : '—'),
          },
          { etiqueta: 'Nombre del titular', valor: (t) => t.titular_nombre || '—' },
          { etiqueta: 'Tipo y número de documento', valor: (t) => t.titular_documento || '—' },
        ],
      },
      {
        // Solo aparece en registros antiguos, hechos con el formato anterior
        titulo: 'Datos del formato anterior',
        columnas: 2,
        ocultaSi: (t) => !t.destino_fondos && !t.descripcion,
        campos: [
          { etiqueta: 'Destino de los fondos', valor: (t) => t.destino_fondos || '—', completo: true, multilinea: true },
          { etiqueta: 'Descripción', valor: (t) => t.descripcion || '—', completo: true, multilinea: true },
        ],
      },
    ],
  };
}
