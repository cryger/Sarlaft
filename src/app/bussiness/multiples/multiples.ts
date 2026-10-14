import { Component, inject } from '@angular/core';

import { nombreTipoIdentificacion } from '../../core/constantes';
import { formatoMoneda, formatoPeriodo } from '../../core/formato';
import { TransaccionMultiple, TransaccionesMultiplesService } from '../../shared/services/transacciones-multiples';
import { ConfigLista } from '../formularios/formulario-config';
import { FormularioLista } from '../formularios/formulario-lista';

/** Lista del formato E-PL-FO-16 (Transacciones múltiples en efectivo). */
@Component({
  selector: 'app-multiples',
  imports: [FormularioLista],
  template: `<app-formulario-lista [config]="config" [api]="api" />`,
})
export class Multiples {
  readonly api = inject(TransaccionesMultiplesService);

  readonly config: ConfigLista<TransaccionMultiple> = {
    titulo: 'Transacciones múltiples en efectivo',
    ruta: '/transacciones-multiples',
    id: (m) => m.id_multiple,
    buscarPlaceholder: 'Consecutivo, tercero o área...',
    nuevoTexto: 'Nuevo reporte',
    vacioTitulo: 'Todavía no hay reportes de transacciones múltiples',
    vacioTexto: 'Regístralo cuando un mismo tercero acumule pagos en efectivo que en conjunto superen el umbral.',
    columnas: [
      {
        titulo: 'Tercero',
        valor: (m) => m.tercero_nombre || '—',
        secundario: (m) => `${nombreTipoIdentificacion(m.tercero_tipo_id)} ${m.tercero_numero_id ?? ''}`.trim(),
        negrita: true,
      },
      {
        titulo: 'Área y periodo',
        valor: (m) => m.area_responsable || '—',
        secundario: (m) => formatoPeriodo(m.periodo_reporte),
      },
      {
        titulo: 'Transacciones',
        valor: (m) => String(m.num_transacciones),
        secundario: (m) => (m.periodo_acumulado ? `Acumulado por ${m.periodo_acumulado.toLowerCase()}` : ''),
      },
      {
        titulo: 'Total acumulado',
        valor: (m) => formatoMoneda(m.total_acumulado),
        secundario: (m) => (m.supera_umbral === 'SI' ? 'Supera el umbral' : 'Bajo el umbral'),
        derecha: true,
        negrita: true,
      },
    ],
  };
}
