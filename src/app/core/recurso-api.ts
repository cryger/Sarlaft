import { HttpClient, HttpParams } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from './api.config';
import { RespuestaApi } from './api.types';

export type Filtros = Record<string, string | number | boolean | null | undefined>;

/** CRUD base: listar, obtener, crear, actualizar y eliminar contra la API. */
export abstract class RecursoApi<T, TEntrada = Partial<T>> {
  protected readonly http = inject(HttpClient);

  protected constructor(protected readonly ruta: string) {}

  listar(filtros: Filtros = {}): Observable<RespuestaApi<T[]>> {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor !== undefined && valor !== null && valor !== '') {
        params = params.set(clave, String(valor));
      }
    }
    return this.http.get<RespuestaApi<T[]>>(`${API_URL}/${this.ruta}`, { params });
  }

  obtener(id: number): Observable<RespuestaApi<T>> {
    return this.http.get<RespuestaApi<T>>(`${API_URL}/${this.ruta}/${id}`);
  }

  crear(datos: TEntrada): Observable<RespuestaApi<T>> {
    return this.http.post<RespuestaApi<T>>(`${API_URL}/${this.ruta}`, datos);
  }

  actualizar(id: number, datos: Partial<TEntrada>): Observable<RespuestaApi<T>> {
    return this.http.put<RespuestaApi<T>>(`${API_URL}/${this.ruta}/${id}`, datos);
  }

  eliminar(id: number): Observable<RespuestaApi<null>> {
    return this.http.delete<RespuestaApi<null>>(`${API_URL}/${this.ruta}/${id}`);
  }
}
