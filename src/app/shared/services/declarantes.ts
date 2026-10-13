import { Injectable } from '@angular/core';

import { RecursoApi } from '../../core/recurso-api';

export type { RespuestaApi } from '../../core/api.types';

export interface Declarante {
  id_declarante: number;
  nombre: string;
  tipo_documento: string;
  numero_documento: string;
  cargo: string;
  id_dependencia: number;
  dependencia?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  correo?: string | null;
  fecha_registro?: string;
}

export interface DeclaranteEntrada {
  nombre: string;
  tipo_documento: string;
  numero_documento: string;
  cargo: string;
  id_dependencia: number;
  direccion?: string | null;
  telefono?: string | null;
  correo?: string | null;
}

@Injectable({ providedIn: 'root' })
export class DeclarantesService extends RecursoApi<Declarante, DeclaranteEntrada> {
  constructor() {
    super('declarantes');
  }
}
