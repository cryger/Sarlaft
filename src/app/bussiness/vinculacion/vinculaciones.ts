import { Component, inject } from '@angular/core';

import { formatoFecha } from '../../core/formato';
import { Vinculacion, VinculacionTercerosService } from '../../shared/services/vinculacion-terceros';
import { ConfigLista } from '../formularios/formulario-config';
import { FormularioLista } from '../formularios/formulario-lista';

/** Lista del formato E-PL-FO-09 (Vinculación y actualización de terceros). */
@Component({
  selector: 'app-vinculaciones',
  imports: [FormularioLista],
  template: `<app-formulario-lista [config]="config" [api]="api" />`,
})
export class Vinculaciones {
  readonly api = inject(VinculacionTercerosService);

  readonly config: ConfigLista<Vinculacion> = {
    titulo: 'Vinculación de terceros',
    ruta: '/vinculacion-terceros',
    id: (v) => v.id_vinculacion,
    buscarPlaceholder: 'Consecutivo, tercero, documento o clase...',
    nuevoTexto: 'Nueva vinculación',
    vacioTitulo: 'Todavía no hay formatos de vinculación',
    vacioTexto: 'Registra aquí a los clientes, proveedores, contratistas y accionistas del hospital.',
    columnas: [
      {
        titulo: 'Tercero',
        valor: (v) => v.tercero_nombre || '—',
        secundario: (v) => `${v.tercero_tipo_id ?? ''} ${v.tercero_numero_id ?? ''}`.trim(),
        negrita: true,
      },
      {
        titulo: 'Clase',
        valor: (v) => v.clase_vinculacion,
        secundario: (v) => `Persona ${v.tipo_persona.toLowerCase()}`,
      },
      {
        titulo: 'Solicitud',
        valor: (v) => v.tipo_solicitud,
        secundario: (v) => formatoFecha(v.fecha_diligenciamiento),
      },
      {
        titulo: 'Alerta PEP',
        valor: (v) => (v.alerta_pep === 'SI' ? 'Posible PEP' : 'Sin alerta'),
        secundario: (v) => (v.alerta_pep === 'SI' ? 'Revisar con el Oficial de Cumplimiento' : ''),
        negrita: true,
      },
    ],
  };
}
