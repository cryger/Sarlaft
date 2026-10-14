import { Component, inject } from '@angular/core';

import { formatoFecha, formatoMoneda } from '../../core/formato';
import { ReporteRos, ReportesRosService } from '../../shared/services/reportes-ros';
import { ConfigLista } from '../formularios/formulario-config';
import { FormularioLista } from '../formularios/formulario-lista';

/** Lista del formato E-PL-FO-14 (ROS). Solo la ven los administradores. */
@Component({
  selector: 'app-reportes-ros',
  imports: [FormularioLista],
  template: `<app-formulario-lista [config]="config" [api]="api" />`,
})
export class ReportesRos {
  readonly api = inject(ReportesRosService);

  readonly config: ConfigLista<ReporteRos> = {
    titulo: 'Operaciones intentadas, inusuales o sospechosas (ROS)',
    ruta: '/reportes-ros',
    id: (r) => r.id_ros,
    buscarPlaceholder: 'Consecutivo, tercero o reportante...',
    nuevoTexto: 'Nuevo reporte',
    vacioTitulo: 'Todavía no hay reportes ROS',
    vacioTexto: 'Cuando se reciba un reporte de operación sospechosa, intentada o inusual aparecerá aquí.',
    columnas: [
      {
        titulo: 'Reportante',
        valor: (r) => r.declarante_nombre || 'Anónimo',
        secundario: (r) => r.declarante_dependencia || '',
        negrita: true,
      },
      { titulo: 'Operación', valor: (r) => r.tipo_operacion || '—', secundario: (r) => formatoFecha(r.fecha_reporte) },
      {
        titulo: 'Tercero involucrado',
        valor: (r) => r.nombre_tercero || '—',
        secundario: (r) => `${r.tipo_tercero ?? ''} · ${r.tipo_identificacion ?? ''} ${r.numero_identificacion ?? ''}`.trim(),
      },
      { titulo: 'Valor económico', valor: (r) => formatoMoneda(r.valor_economico), derecha: true, negrita: true },
    ],
  };
}
