import { Injectable } from '@angular/core';

import { RecursoApi } from '../../core/recurso-api';

export interface Dependencia {
  id_dependencia: number;
  nombre: string;
}

@Injectable({ providedIn: 'root' })
export class DependenciasService extends RecursoApi<Dependencia, { nombre: string }> {
  constructor() {
    super('dependencias');
  }
}
