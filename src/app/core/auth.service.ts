import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Observable, map, tap } from 'rxjs';

import { API_URL } from './api.config';
import { RespuestaApi } from './api.types';

export type Rol = 'Administrador' | 'Gestor';

export interface UsuarioSesion {
  id_usuario: number;
  nombre: string;
  usuario: string;
  correo: string | null;
  rol: Rol;
}

const CLAVE_TOKEN = 'sarlaft_token';
const CLAVE_USUARIO = 'sarlaft_usuario';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly _token = signal<string | null>(this.leer(CLAVE_TOKEN));
  private readonly _usuario = signal<UsuarioSesion | null>(this.leerUsuario());

  readonly usuario = this._usuario.asReadonly();
  readonly autenticado = computed(() => !!this._token() && !!this._usuario());
  readonly esAdmin = computed(() => this._usuario()?.rol === 'Administrador');

  token(): string | null {
    return this._token();
  }

  login(usuario: string, password: string): Observable<UsuarioSesion> {
    return this.http
      .post<RespuestaApi<{ token: string; usuario: UsuarioSesion }>>(`${API_URL}/auth/login`, {
        usuario,
        password,
      })
      .pipe(
        tap((r) => this.guardar(r.data.token, r.data.usuario)),
        map((r) => r.data.usuario),
      );
  }
    /** Refresca los datos del usuario de la sesión (por ejemplo después de editar su perfil). */
  actualizarUsuario(usuario: UsuarioSesion): void {
    const token = this._token();
    if (token) {
      this.guardar(token, usuario);
    }
  }

  logout(redirigir = true): void {
    this._token.set(null);
    this._usuario.set(null);

    if (this.esNavegador) {
      sessionStorage.removeItem(CLAVE_TOKEN);
      sessionStorage.removeItem(CLAVE_USUARIO);
    }
    if (redirigir) {
      void this.router.navigate(['/login']);
    }
  }

  // La sesión vive en sessionStorage: se cierra al cerrar la pestaña.
  private guardar(token: string, usuario: UsuarioSesion): void {
    this._token.set(token);
    this._usuario.set(usuario);

    if (this.esNavegador) {
      sessionStorage.setItem(CLAVE_TOKEN, token);
      sessionStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
    }
  }

  private leer(clave: string): string | null {
    try {
      return this.esNavegador ? sessionStorage.getItem(clave) : null;
    } catch {
      return null;
    }
  }

  private leerUsuario(): UsuarioSesion | null {
    const crudo = this.leer(CLAVE_USUARIO);
    if (!crudo) {
      return null;
    }
    try {
      return JSON.parse(crudo) as UsuarioSesion;
    } catch {
      return null;
    }
  }
}
