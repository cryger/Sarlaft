import { Observable } from 'rxjs';

import { API_URL } from '../../core/api.config';
import { RespuestaApi } from '../../core/api.types';
import { RecursoApi } from '../../core/recurso-api';

export type EstadoFormulario = 'Pendiente' | 'Aprobado' | 'Rechazado';

/** Campos que comparten transacciones, ausencias y reportes ROS. */
export interface FormularioBase {
  consecutivo: string;
  id_declarante: number;
  fecha_registro: string;
  ip: string | null;
  estado: EstadoFormulario;
  usuario_revision: number | null;
  fecha_revision: string | null;
  fecha_aprobacion: string | null;
  archivo_pdf: string | null;
  declarante_nombre?: string | null;
  declarante_tipo_documento?: string | null;
  declarante_documento?: string | null;
  declarante_telefono?: string | null;
  declarante_correo?: string | null;
  declarante_direccion?: string | null;
  revisor_nombre?: string | null;
}

export abstract class FormularioApi<T, TEntrada> extends RecursoApi<T, TEntrada> {
  /** Solo administradores. Para rechazar es obligatorio indicar el motivo. */
  revisar(id: number, estado: EstadoFormulario, observacion?: string): Observable<RespuestaApi<T>> {
    return this.http.patch<RespuestaApi<T>>(`${API_URL}/${this.ruta}/${id}/revision`, {
      estado,
      observacion,
    });
  }
}
