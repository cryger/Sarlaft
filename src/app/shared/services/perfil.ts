import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../../core/api.config';
import { RespuestaApi } from '../../core/api.types';
import { UsuarioSesion } from '../../core/auth.service';

/** Un movimiento del propio usuario (viene de la auditoría). */
export interface ActividadPerfil {
  id_historial: number;
  modulo: string;
  registro: number;
  accion: string;
  /** AAAA-MM-DD HH:MM:SS */
  fecha: string;
  observaciones: string | null;
}

export interface Perfil {
  usuario: UsuarioSesion & { fecha_creacion: string | null };
  /** Fecha del inicio de sesión anterior al actual (null si es el primero). */
  ultimo_acceso: string | null;
  actividad: ActividadPerfil[];
}

/** Cada usuario consulta y edita solo su propia cuenta. */
@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly http = inject(HttpClient);

  obtener(): Observable<RespuestaApi<Perfil>> {
    return this.http.get<RespuestaApi<Perfil>>(`${API_URL}/auth/perfil`);
  }

  /** Solo nombre y correo: el usuario, el rol y el estado los cambia un administrador. */
  actualizar(datos: { nombre: string; correo: string | null }): Observable<RespuestaApi<UsuarioSesion>> {
    return this.http.put<RespuestaApi<UsuarioSesion>>(`${API_URL}/auth/perfil`, datos);
  }

  cambiarPassword(actual: string, nueva: string): Observable<RespuestaApi<null>> {
    return this.http.post<RespuestaApi<null>>(`${API_URL}/auth/cambiar-password`, { actual, nueva });
  }
}
