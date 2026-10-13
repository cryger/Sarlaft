import { Injectable } from '@angular/core';

import { RecursoApi } from '../../core/recurso-api';

export interface Dependencia {
  id_dependencia: number;
  nombre: string;
  /** Cuántos declarantes pertenecen a la dependencia (lo calcula la API). */
  total_declarantes?: number;
}

@Injectable({ providedIn: 'root' })
export class DependenciasService extends RecursoApi<Dependencia, { nombre: string }> {
  constructor() {
    super('dependencias');
  }
}
