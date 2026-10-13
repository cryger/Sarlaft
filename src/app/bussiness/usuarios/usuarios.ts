import { Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { mensajeApi } from '../../core/api.types';
import { AuthService, Rol } from '../../core/auth.service';
import { Usuario, UsuarioEntrada, UsuariosService } from '../../shared/services/usuarios';

type Campo = 'nombre' | 'usuario' | 'correo' | 'rol' | 'password' | 'confirmar';

/** Rechaza textos que solo tienen espacios. */
function noVacio(control: AbstractControl): ValidationErrors | null {
  const v = control.value;
  return typeof v === 'string' && v.length > 0 && v.trim() === '' ? { required: true } : null;
}

/** La confirmación debe ser igual a la contraseña. */
function coinciden(grupo: AbstractControl): ValidationErrors | null {
  const clave = grupo.get('password')?.value ?? '';
  const confirmar = grupo.get('confirmar')?.value ?? '';
  return clave === confirmar ? null : { noCoinciden: true };
}

/** Para buscar sin importar tildes ni mayúsculas. */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

const porNombre = (a: Usuario, b: Usuario) => a.nombre.localeCompare(b.nombre, 'es');

@Component({
  selector: 'app-usuarios',
  imports: [ReactiveFormsModule],
  templateUrl: './usuarios.html',
})
export class Usuarios implements OnInit {
  private readonly api = inject(UsuariosService);
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);

  private readonly dlgForm = viewChild.required<ElementRef<HTMLDialogElement>>('dlgForm');
  private readonly dlgEliminar = viewChild.required<ElementRef<HTMLDialogElement>>('dlgEliminar');

  // ---- Lista
  usuarios = signal<Usuario[]>([]);
  cargando = signal(true);
  error = signal('');
  errorAccion = signal('');
  exito = signal('');
  cambiandoId = signal<number | null>(null);

  termino = signal('');
  filtroRol = signal<'' | Rol>('');
  filtroEstado = signal<'' | 'activos' | 'inactivos'>('');

  filtrados = computed(() => {
    const t = normalizar(this.termino().trim());
    const rol = this.filtroRol();
    const estado = this.filtroEstado();

    return this.usuarios().filter((u) => {
      if (rol && u.rol !== rol) return false;
      if (estado === 'activos' && !u.estado) return false;
      if (estado === 'inactivos' && u.estado) return false;
      if (!t) return true;
      return normalizar(`${u.nombre} ${u.usuario} ${u.correo ?? ''}`).includes(t);
    });
  });

  activos = computed(() => this.usuarios().filter((u) => u.estado).length);
  hayFiltros = computed(() => !!(this.termino().trim() || this.filtroRol() || this.filtroEstado()));

  // ---- Ventana de crear / editar
  seleccionado = signal<Usuario | null>(null); // null = crear
  guardando = signal(false);
  errorForm = signal('');
  intento = signal(false);
  mostrarClave = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      nombre: ['', [Validators.required, noVacio, Validators.maxLength(150)]],
      usuario: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9._-]{3,50}$/)]],
      correo: ['', [Validators.email, Validators.maxLength(150)]],
      rol: this.fb.nonNullable.control<Rol>('Gestor', [Validators.required]),
      password: [''],
      confirmar: [''],
      activo: [true],
    },
    { validators: coinciden },
  );

  // ---- Ventana de eliminar
  aEliminar = signal<Usuario | null>(null);
  eliminando = signal(false);
  errorEliminar = signal('');

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');

    this.api.listar().subscribe({
      next: (r) => {
        this.usuarios.set(r.data);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeApi(e, 'No fue posible cargar los usuarios.'));
        this.cargando.set(false);
      },
    });
  }

  esYo(u: Usuario): boolean {
    return u.id_usuario === this.auth.usuario()?.id_usuario;
  }

  limpiarFiltros(): void {
    this.termino.set('');
    this.filtroRol.set('');
    this.filtroEstado.set('');
  }

  // ------------------------------------------------------------ crear / editar

  abrirCrear(): void {
    this.abrirForm(null);
  }

  abrirEditar(u: Usuario): void {
    this.abrirForm(u);
  }

  private abrirForm(u: Usuario | null): void {
    this.exito.set('');
    this.errorAccion.set('');
    this.seleccionado.set(u);
    this.intento.set(false);
    this.errorForm.set('');
    this.mostrarClave.set(false);

    // Al crear la contraseña es obligatoria; al editar solo si se quiere cambiar
    const reglasClave = [Validators.minLength(8), Validators.maxLength(72)];
    this.form.controls.password.setValidators(u ? reglasClave : [Validators.required, ...reglasClave]);

    this.form.reset({
      nombre: u?.nombre ?? '',
      usuario: u?.usuario ?? '',
      correo: u?.correo ?? '',
      rol: u?.rol ?? 'Gestor',
      password: '',
      confirmar: '',
      activo: u ? u.estado : true,
    });

    // Nadie puede quitarse su propio rol ni desactivarse
    if (u && this.esYo(u)) {
      this.form.controls.rol.disable();
      this.form.controls.activo.disable();
    } else {
      this.form.controls.rol.enable();
      this.form.controls.activo.enable();
    }

    this.dlgForm().nativeElement.showModal();
  }

  /** Texto de error de un campo (vacío si no hay error o aún no se debe mostrar). */
  mensaje(campo: Campo): string {
    if (campo === 'confirmar') {
      const tocado = this.form.controls.confirmar.touched || this.intento();
      return tocado && this.form.hasError('noCoinciden') ? 'Las contraseñas no coinciden.' : '';
    }

    const c = this.form.controls[campo];
    if (!c.invalid || !(c.touched || this.intento())) {
      return '';
    }

    const e = c.errors ?? {};
    if (e['servidor']) return e['servidor'] as string;
    if (e['required']) {
      return campo === 'password' ? 'Escribe una contraseña.' : 'Este campo es obligatorio.';
    }
    if (e['minlength']) return `Mínimo ${e['minlength'].requiredLength} caracteres.`;
    if (e['maxlength']) return `Máximo ${e['maxlength'].requiredLength} caracteres.`;
    if (e['email']) return 'Escribe un correo válido, por ejemplo nombre@dominio.com.';
    if (e['pattern']) return 'Usa de 3 a 50 caracteres: letras, números, punto, guion o guion bajo (sin espacios).';
    return 'Valor no válido.';
  }

  /** Genera una contraseña aleatoria, la escribe en los dos campos y la deja visible para copiarla. */
  generarClave(): void {
    const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    const azar = crypto.getRandomValues(new Uint32Array(12));
    const clave = Array.from(azar, (n) => alfabeto[n % alfabeto.length]).join('');

    this.form.controls.password.setValue(clave);
    this.form.controls.confirmar.setValue(clave);
    this.mostrarClave.set(true);
  }

  guardar(): void {
    if (this.guardando()) {
      return;
    }

    this.intento.set(true);
    this.errorForm.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const actual = this.seleccionado();
    const base = {
      nombre: v.nombre.trim(),
      usuario: v.usuario.trim(),
      correo: v.correo.trim() || null,
    };

    this.guardando.set(true);

    let peticion;
    if (actual) {
      const datos: Partial<UsuarioEntrada> = { ...base };
      if (!this.esYo(actual)) {
        datos.rol = v.rol;
        datos.estado = v.activo;
      }
      if (v.password) {
        datos.password = v.password; // en blanco = no se cambia
      }
      peticion = this.api.actualizar(actual.id_usuario, datos);
    } else {
      peticion = this.api.crear({ ...base, password: v.password, rol: v.rol });
    }

    peticion.subscribe({
      next: (r) => {
        this.usuarios.update((lista) =>
          (actual
            ? lista.map((u) => (u.id_usuario === actual.id_usuario ? r.data : u))
            : [...lista, r.data]
          ).sort(porNombre),
        );
        this.exito.set(
          actual
            ? `El usuario «${base.usuario}» se actualizó correctamente.`
            : `El usuario «${base.usuario}» se creó correctamente.`,
        );
        this.guardando.set(false);
        this.dlgForm().nativeElement.close();
      },
      error: (e) => {
        // La API devuelve errores por campo: se muestran junto a cada campo
        const errores = (e?.error?.errors ?? {}) as Record<string, string>;
        let enCampos = false;
        for (const [campo, texto] of Object.entries(errores)) {
          const control = this.form.get(campo);
          if (control && campo !== 'activo') {
            control.setErrors({ servidor: texto });
            control.markAsTouched();
            enCampos = true;
          }
        }

        this.errorForm.set(
          enCampos
            ? 'Revisa los campos marcados en rojo.'
            : mensajeApi(e, 'No fue posible guardar el usuario.'),
        );
        this.guardando.set(false);
      },
    });
  }

  // --------------------------------------------------------- activar / desactivar

  cambiarEstado(u: Usuario): void {
    if (this.esYo(u) || this.cambiandoId() !== null) {
      return;
    }

    this.exito.set('');
    this.errorAccion.set('');
    this.cambiandoId.set(u.id_usuario);

    this.api.actualizar(u.id_usuario, { estado: !u.estado }).subscribe({
      next: (r) => {
        this.usuarios.update((lista) => lista.map((x) => (x.id_usuario === u.id_usuario ? r.data : x)));
        this.exito.set(
          r.data.estado
            ? `El usuario «${u.usuario}» quedó activo.`
            : `El usuario «${u.usuario}» quedó inactivo y ya no puede iniciar sesión.`,
        );
        this.cambiandoId.set(null);
      },
      error: (e) => {
        this.errorAccion.set(mensajeApi(e, 'No fue posible cambiar el estado del usuario.'));
        this.cambiandoId.set(null);
      },
    });
  }

  // ------------------------------------------------------------------ eliminar

  pedirEliminar(u: Usuario): void {
    this.exito.set('');
    this.errorAccion.set('');
    this.aEliminar.set(u);
    this.errorEliminar.set('');
    this.dlgEliminar().nativeElement.showModal();
  }

  confirmarEliminar(): void {
    const u = this.aEliminar();
    if (!u || this.eliminando()) {
      return;
    }

    this.eliminando.set(true);
    this.errorEliminar.set('');

    this.api.eliminar(u.id_usuario).subscribe({
      next: () => {
        this.usuarios.update((lista) => lista.filter((x) => x.id_usuario !== u.id_usuario));
        this.exito.set(`El usuario «${u.usuario}» se eliminó correctamente.`);
        this.eliminando.set(false);
        this.dlgEliminar().nativeElement.close();
      },
      error: (e) => {
        // Si ya tiene movimientos en el historial la API no lo deja eliminar: se ofrece desactivarlo
        this.errorEliminar.set(mensajeApi(e, 'No fue posible eliminar el usuario.'));
        this.eliminando.set(false);
      },
    });
  }

  desactivarEnSuLugar(): void {
    const u = this.aEliminar();
    this.dlgEliminar().nativeElement.close();
    if (u && u.estado) {
      this.cambiarEstado(u);
    }
  }

  // ------------------------------------------------------------------- común

  /** Cierra la ventana si se hace clic en el fondo oscuro (no dentro del contenido). */
  clicEnFondo(evento: MouseEvent, dialogo: HTMLDialogElement): void {
    if (evento.target === dialogo) {
      dialogo.close();
    }
  }

  iniciales(nombre: string): string {
    return nombre
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase();
  }

  /** 2026-10-07 15:30:00 -> 07/10/2026 */
  fecha(valor: string): string {
    const [a, m, d] = (valor ?? '').slice(0, 10).split('-');
    return a && m && d ? `${d}/${m}/${a}` : valor;
  }
}
