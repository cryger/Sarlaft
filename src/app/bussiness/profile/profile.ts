import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';

import { mensajeApi } from '../../core/api.types';
import { AuthService } from '../../core/auth.service';
import { formatoFecha, formatoFechaHora } from '../../core/formato';
import { Campo as CampoUI } from '../../shared/components/campo/campo';
import { ActividadPerfil, Perfil, PerfilService } from '../../shared/services/perfil';

type CampoDatos = 'nombre' | 'correo';
type CampoClave = 'actual' | 'nueva' | 'confirmar';

/** Rechaza textos que solo tienen espacios. */
function noVacio(control: AbstractControl): ValidationErrors | null {
  const v = control.value;
  return typeof v === 'string' && v.length > 0 && v.trim() === '' ? { required: true } : null;
}

/** La confirmación debe ser igual a la nueva contraseña. */
function coinciden(grupo: AbstractControl): ValidationErrors | null {
  const nueva = grupo.get('nueva')?.value ?? '';
  const confirmar = grupo.get('confirmar')?.value ?? '';
  return nueva === confirmar ? null : { noCoinciden: true };
}

/** Mi perfil: datos de la cuenta, cambio de contraseña y actividad reciente. */
@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, RouterLink, CampoUI],
  templateUrl: './profile.html',
})
export class Profile implements OnInit {
  private readonly api = inject(PerfilService);
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);

  readonly fecha = formatoFecha;
  readonly fechaHora = formatoFechaHora;

  perfil = signal<Perfil | null>(null);
  cargando = signal(true);
  errorCarga = signal('');

  // ---- Datos personales
  readonly datos = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, noVacio, Validators.maxLength(150)]],
    correo: ['', [Validators.email, Validators.maxLength(150)]],
  });
  guardandoDatos = signal(false);
  intentoDatos = signal(false);
  exitoDatos = signal('');
  errorDatos = signal('');

  // ---- Contraseña
  readonly clave = this.fb.nonNullable.group(
    {
      actual: ['', [Validators.required]],
      nueva: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
      confirmar: ['', [Validators.required]],
    },
    { validators: coinciden },
  );
  guardandoClave = signal(false);
  intentoClave = signal(false);
  exitoClave = signal('');
  errorClave = signal('');
  mostrarClaves = signal(false);

  private readonly valoresClave = toSignal(this.clave.valueChanges, { initialValue: this.clave.getRawValue() });

  /** Lista de requisitos que se va marcando mientras se escribe. */
  requisitos = computed(() => {
    const v = this.valoresClave();
    return [
      { texto: 'Al menos 8 caracteres', ok: (v.nueva ?? '').length >= 8 },
      { texto: 'Distinta de la contraseña actual', ok: !!v.nueva && v.nueva !== v.actual },
      { texto: 'Las dos contraseñas coinciden', ok: !!v.nueva && v.nueva === v.confirmar },
    ];
  });

  // ---- Datos derivados
  iniciales = computed(() =>
    (this.perfil()?.usuario.nombre ?? '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase(),
  );

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');

    this.api.obtener().subscribe({
      next: (r) => {
        this.perfil.set(r.data);
        this.datos.reset({ nombre: r.data.usuario.nombre, correo: r.data.usuario.correo ?? '' });
        this.cargando.set(false);
      },
      error: (e) => {
        this.errorCarga.set(mensajeApi(e, 'No fue posible cargar tu perfil.'));
        this.cargando.set(false);
      },
    });
  }

  // ------------------------------------------------------------------ datos

  mensajeDato(campo: CampoDatos): string {
    const c = this.datos.controls[campo];
    if (!c.invalid || !(c.touched || this.intentoDatos())) return '';
    const e = c.errors ?? {};
    if (e['servidor']) return e['servidor'] as string;
    if (e['required']) return 'Este campo es obligatorio.';
    if (e['email']) return 'Escribe un correo válido, por ejemplo nombre@dominio.com.';
    if (e['maxlength']) return `Máximo ${e['maxlength'].requiredLength} caracteres.`;
    return 'Valor no válido.';
  }

  guardarDatos(): void {
    if (this.guardandoDatos()) return;

    this.intentoDatos.set(true);
    this.exitoDatos.set('');
    this.errorDatos.set('');

    if (this.datos.invalid) {
      this.datos.markAllAsTouched();
      return;
    }

    const v = this.datos.getRawValue();
    this.guardandoDatos.set(true);

    this.api.actualizar({ nombre: v.nombre.trim(), correo: v.correo.trim() || null }).subscribe({
      next: (r) => {
        // El nombre del encabezado sale de la sesión: se actualiza para que cambie de inmediato
        this.auth.actualizarUsuario(r.data);
        this.perfil.update((p) => (p ? { ...p, usuario: { ...p.usuario, ...r.data } } : p));
        this.datos.reset({ nombre: r.data.nombre, correo: r.data.correo ?? '' });
        this.intentoDatos.set(false);
        this.exitoDatos.set('Tus datos se actualizaron correctamente.');
        this.guardandoDatos.set(false);
      },
      error: (e) => {
        const errores = (e?.error?.errors ?? {}) as Record<string, string>;
        let enCampos = false;
        for (const [campo, texto] of Object.entries(errores)) {
          const control = this.datos.get(campo);
          if (control) {
            control.setErrors({ servidor: texto });
            control.markAsTouched();
            enCampos = true;
          }
        }
        this.errorDatos.set(
          enCampos ? 'Revisa los campos marcados en rojo.' : mensajeApi(e, 'No fue posible guardar tus datos.'),
        );
        this.guardandoDatos.set(false);
      },
    });
  }

  // ------------------------------------------------------------- contraseña

  mensajeClave(campo: CampoClave): string {
    if (campo === 'confirmar') {
      const tocado = this.clave.controls.confirmar.touched || this.intentoClave();
      if (tocado && this.clave.controls.confirmar.hasError('required')) return 'Confirma la nueva contraseña.';
      return tocado && this.clave.hasError('noCoinciden') && !!this.clave.controls.confirmar.value
        ? 'Las contraseñas no coinciden.'
        : '';
    }

    const c = this.clave.controls[campo];
    if (!c.invalid || !(c.touched || this.intentoClave())) return '';
    const e = c.errors ?? {};
    if (e['servidor']) return e['servidor'] as string;
    if (e['required']) return campo === 'actual' ? 'Escribe tu contraseña actual.' : 'Escribe la nueva contraseña.';
    if (e['minlength']) return `Mínimo ${e['minlength'].requiredLength} caracteres.`;
    if (e['maxlength']) return `Máximo ${e['maxlength'].requiredLength} caracteres.`;
    return 'Valor no válido.';
  }

  cambiarClave(): void {
    if (this.guardandoClave()) return;

    this.intentoClave.set(true);
    this.exitoClave.set('');
    this.errorClave.set('');

    const v = this.clave.getRawValue();

    if (this.clave.invalid) {
      this.clave.markAllAsTouched();
      return;
    }
    if (v.nueva === v.actual) {
      this.clave.controls.nueva.setErrors({ servidor: 'La nueva contraseña debe ser distinta de la actual.' });
      this.clave.controls.nueva.markAsTouched();
      return;
    }

    this.guardandoClave.set(true);

    this.api.cambiarPassword(v.actual, v.nueva).subscribe({
      next: () => {
        this.clave.reset({ actual: '', nueva: '', confirmar: '' });
        this.intentoClave.set(false);
        this.mostrarClaves.set(false);
        this.exitoClave.set('Tu contraseña se actualizó correctamente. Úsala la próxima vez que inicies sesión.');
        this.guardandoClave.set(false);
      },
      error: (e) => {
        const errores = (e?.error?.errors ?? {}) as Record<string, string>;
        let enCampos = false;
        for (const [campo, texto] of Object.entries(errores)) {
          const control = this.clave.get(campo);
          if (control) {
            control.setErrors({ servidor: texto });
            control.markAsTouched();
            enCampos = true;
          }
        }
        this.errorClave.set(
          enCampos ? 'Revisa los campos marcados en rojo.' : mensajeApi(e, 'No fue posible cambiar la contraseña.'),
        );
        this.guardandoClave.set(false);
      },
    });
  }

  // -------------------------------------------------------------- actividad

  detalle(a: ActividadPerfil): string {
    return a.observaciones || (a.modulo === 'Autenticación' ? 'Sesión iniciada' : `#${a.registro}`);
  }

  estiloAccion(accion: string): string {
    if (accion === 'Eliminación' || accion === 'Revisión: Rechazado') return 'from-red-600 to-red-400';
    if (accion === 'Creación' || accion === 'Revisión: Aprobado') return 'from-green-600 to-green-400';
    if (accion === 'Actualización') return 'from-blue-600 to-blue-400';
    if (accion === 'Revisión: Pendiente') return 'from-orange-600 to-orange-400';
    return 'from-gray-500 to-gray-400';
  }
}
