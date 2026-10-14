import { Component, inject } from '@angular/core';

import { nombreTipoIdentificacion } from '../../core/constantes';
import { formatoFecha, formatoMoneda } from '../../core/formato';
import { ReporteRos, ReportesRosService } from '../../shared/services/reportes-ros';
import { ConfigDetalle } from '../formularios/formulario-config';
import { FormularioDetalle } from '../formularios/formulario-detalle';

/** Detalle del formato E-PL-FO-14 (ROS). Solo lo ven los administradores. */
@Component({
  selector: 'app-ros-detalle',
  imports: [FormularioDetalle],
  template: `<app-formulario-detalle [config]="config" [api]="api" />`,
})
export class RosDetalle {
  readonly api = inject(ReportesRosService);

  readonly config: ConfigDetalle<ReporteRos> = {
    titulo: (r) => `Reporte ROS ${r.consecutivo}`,
    subtitulo: 'Formato E-PL-FO-14 · Confidencial',
    ruta: '/reportes-ros',
    id: (r) => r.id_ros,
    sustantivo: 'reporte',
    femenino: false,
    observacionRevision: (r) => r.observaciones_revision,
    secciones: [
      {
        titulo: 'Información del reportante',
        columnas: 3,
        campos: [
          { etiqueta: 'Nombre', valor: (r) => r.declarante_nombre || 'Anónimo' },
          { etiqueta: 'Área', valor: (r) => r.declarante_dependencia || (r.declarante_nombre ? '—' : 'No aplica') },
          { etiqueta: 'Cargo', valor: (r) => r.declarante_cargo || (r.declarante_nombre ? '—' : 'No aplica') },
        ],
      },
      {
        titulo: 'Información del reporte',
        columnas: 3,
        campos: [
          { etiqueta: 'Fecha de reporte', valor: (r) => formatoFecha(r.fecha_reporte) },
          { etiqueta: 'Operación reportada', valor: (r) => r.tipo_operacion || '—' },
          { etiqueta: 'Área / proceso involucrado', valor: (r) => r.area_involucrada || '—' },
        ],
      },
      {
        titulo: 'Información del tercero involucrado',
        columnas: 2,
        campos: [
          { etiqueta: 'Nombre del tercero', valor: (r) => r.nombre_tercero || '—' },
          { etiqueta: 'Tipo de tercero', valor: (r) => r.tipo_tercero || '—' },
          { etiqueta: 'Tipo de documento', valor: (r) => nombreTipoIdentificacion(r.tipo_identificacion) },
          { etiqueta: 'Número de identificación', valor: (r) => r.numero_identificacion || '—' },
        ],
      },
      {
        titulo: 'Descripción de la operación',
        columnas: 2,
        campos: [
          { etiqueta: 'Descripción detallada', valor: (r) => r.descripcion || '—', completo: true, multilinea: true },
          { etiqueta: 'Valor económico involucrado', valor: (r) => formatoMoneda(r.valor_economico), destacado: true },
        ],
      },
      {
        titulo: 'Análisis del reporte',
        columnas: 2,
        campos: [
          {
            etiqueta: 'Indicios que la hacen sospechosa, intentada o inusual',
            valor: (r) => r.indicios || '—',
            completo: true,
            multilinea: true,
          },
          {
            etiqueta: 'Relación con otras operaciones previas',
            valor: (r) => r.relacion_operaciones || 'Sin relación reportada',
            completo: true,
            multilinea: true,
          },
          {
            etiqueta: 'Observaciones adicionales',
            valor: (r) => r.observaciones_adicionales || 'Sin observaciones',
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
            valor: (r) => (r.autoriza_datos === 'SI' ? 'Autorizada' : r.autoriza_datos === 'NO' ? 'No autorizada' : '—'),
          },
          { etiqueta: 'Nombre del titular', valor: (r) => r.titular_nombre || '—' },
          { etiqueta: 'Tipo y número de documento', valor: (r) => r.titular_documento || '—' },
        ],
      },
    ],
  };
}
