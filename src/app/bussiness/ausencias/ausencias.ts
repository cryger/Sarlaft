import { Component, inject } from '@angular/core';

import { formatoFecha } from '../../core/formato';
import { Ausencia, AusenciasService } from '../../shared/services/ausencias';
import { ConfigLista } from '../formularios/formulario-config';
import { FormularioLista } from '../formularios/formulario-lista';

/** Lista del formato E-PL-FO-13 (Ausencia de transacciones en efectivo). */
@Component({
  selector: 'app-ausencias',
  imports: [FormularioLista],
  template: `<app-formulario-lista [config]="config" [api]="api" />`,
})
export class Ausencias {
  readonly api = inject(AusenciasService);

  readonly config: ConfigLista<Ausencia> = {
    titulo: 'Ausencia de transacciones en efectivo',
    ruta: '/ausencias',
    id: (a) => a.id_ausencia,
    buscarPlaceholder: 'Consecutivo, responsable o área...',
    nuevoTexto: 'Nuevo reporte',
    vacioTitulo: 'Todavía no hay reportes de ausencia',
    vacioTexto: 'Registra el primero cuando un área no haya tenido transacciones en efectivo en el periodo.',
    columnas: [
      {
        titulo: 'Responsable',
        valor: (a) => a.declarante_nombre || 'Sin responsable',
        secundario: (a) => a.declarante_cargo || '',
        negrita: true,
      },
      { titulo: 'Área / proceso', valor: (a) => a.area_proceso || '—' },
      {
        titulo: 'Periodo reportado',
        valor: (a) => `${formatoFecha(a.periodo_desde)} – ${formatoFecha(a.periodo_hasta)}`,
      },
    ],
  };
}
