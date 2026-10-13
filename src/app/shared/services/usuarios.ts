import { Injectable } from '@angular/core';

import { Rol } from '../../core/auth.service';
import { RecursoApi } from '../../core/recurso-api';

export interface Usuario {
  id_usuario: number;
  nombre: string;
  usuario: string;
  correo: string | null;
  rol: Rol;
  estado: boolean;
  fecha_creacion: string;
}

export interface UsuarioEntrada {
  nombre: string;
  usuario: string;
  /** Obligatoria al crear. Al editar, envíala solo si quieres cambiarla. */
  password?: string;
  correo?: string | null;
  rol: Rol;
  estado?: boolean;
}

@Injectable({ providedIn: 'root' })
export class UsuariosService extends RecursoApi<Usuario, UsuarioEntrada> {
  constructor() {
    super('usuarios');
  }
}
