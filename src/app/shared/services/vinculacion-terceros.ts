import { Injectable } from '@angular/core';

import { FormularioApi, FormularioBase } from './formulario-api';

export type TipoSolicitud = 'Vinculación' | 'Actualización de datos';
export type ClaseVinculacion = 'Cliente' | 'Proveedor' | 'Contratista' | 'Accionista';
export type TipoPersona = 'Natural' | 'Jurídica';

/** Datos de una sección del formato (los campos están definidos en vinculacion-campos.ts). */
export type Seccion = Record<string, any>;

export interface DatosVinculacion {
  persona: Seccion;
  /** Solo persona jurídica. */
  representante?: Seccion;
  tributaria: Record<string, boolean>;
  financiera: Seccion;
  /** Solo persona jurídica. */
  accionistas: Seccion[];
  internacional: { operaciones: string[]; productos_exterior: string | null; productos: Seccion[] };
  pep: Seccion;
  origen: { origen_fondos: string; acepta_declaracion: boolean };
  autorizacion: { acepta: boolean };
  firma: { firmante_nombre: string; firma_fisica: boolean };
}

export interface Vinculacion extends FormularioBase {
  id_vinculacion: number;
  tipo_solicitud: TipoSolicitud;
  clase_vinculacion: ClaseVinculacion;
  tipo_persona: TipoPersona;
  fecha_diligenciamiento: string;

  // Los calcula la API a partir del formulario
  tercero_nombre: string | null;
  tercero_tipo_id: string | null;
  tercero_numero_id: string | null;
  /** SI cuando alguna respuesta de la sección 4 (PEP) es afirmativa. */
  alerta_pep: string | null;

  observacion_revision: string | null;

  /** Solo viene al pedir un registro, no en la lista. */
  formulario?: DatosVinculacion;
}

export interface VinculacionEntrada {
  tipo_solicitud: TipoSolicitud;
  clase_vinculacion: ClaseVinculacion;
  tipo_persona: TipoPersona;
  fecha_diligenciamiento: string;
  formulario: DatosVinculacion;
}

@Injectable({ providedIn: 'root' })
export class VinculacionTercerosService extends FormularioApi<Vinculacion, VinculacionEntrada> {
  constructor() {
    super('vinculacion-terceros');
  }
}
