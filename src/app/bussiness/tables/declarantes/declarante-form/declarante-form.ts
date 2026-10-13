import { Component, ElementRef, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { mensajeApi } from '../../../../core/api.types';
import { AuthService } from '../../../../core/auth.service';
import { Declarante, DeclaranteEntrada, DeclarantesService } from '../../../../shared/services/declarantes';
import { Dependencia, DependenciasService } from '../../../../shared/services/dependencias';

type Campo =
  | 'nombre'
  | 'tipo_documento'
  | 'numero_documento'
  | 'cargo'
  | 'id_dependencia'
  | 'direccion'
  | 'telefono'
  | 'correo';

/** Rechaza textos que solo tienen espacios. */
function noVacio(control: AbstractControl): ValidationErrors | null {
  const v = control.value;
  return typeof v === 'string' && v.length > 0 && v.trim() === '' ? { required: true } : null;
}

/**
 * Formulario para crear (/declarantes/nuevo) y editar (/declarantes/:id/editar) declarantes.
 */
@Component({
  selector: 'app-declarante-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './declarante-form.html',
})
export class DeclaranteForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly declarantesApi = inject(DeclarantesService);
  private readonly dependenciasApi = inject(DependenciasService);
  readonly auth = inject(AuthService);

  readonly tiposDocumento = [
    { valor: 'CC', etiqueta: 'Cédula de ciudadanía' },
    { valor: 'CE', etiqueta: 'Cédula de extranjería' },
    { valor: 'TI', etiqueta: 'Tarjeta de identidad' },
    { valor: 'NIT', etiqueta: 'NIT' },
    { valor: 'PA', etiqueta: 'Pasaporte' },
    { valor: 'PEP', etiqueta: 'Permiso especial de permanencia' },
    { valor: 'PPT', etiqueta: 'Permiso por protección temporal' },
  ];

  /** null = crear; número = editar */
  readonly id: number | null = Number(this.route.snapshot.paramMap.get('id')) || null;
  readonly editando = this.id !== null;

  dependencias = signal<Dependencia[]>([]);
  tiposExtra = signal<string[]>([]); // tipo de documento guardado que no está en la lista
  cargando = signal(true);
  errorCarga = signal('');
  guardando = signal(false);
  error = signal('');
  intento = signal(false); // ya se intentó enviar: se muestran todos los errores

  // Crear dependencia desde el formulario (solo administradores)
  mostrarNuevaDependencia = signal(false);
  nuevaDependencia = signal('');
  creandoDependencia = signal(false);
  errorDependencia = signal('');

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, noVacio, Validators.maxLength(200)]],
    tipo_documento: ['', [Validators.required]],
    numero_documento: [
      '',
      [Validators.required, noVacio, Validators.maxLength(30), Validators.pattern(/^[A-Za-z0-9-]+$/)],
    ],
    cargo: ['', [Validators.required, noVacio, Validators.maxLength(150)]],
    id_dependencia: this.fb.control<number | null>(null, [Validators.required]),
    direccion: ['', [Validators.maxLength(250)]],
    telefono: ['', [Validators.maxLength(30), Validators.pattern(/^[0-9+()\-\s]*$/)]],
    correo: ['', [Validators.email, Validators.maxLength(150)]],
  });

  ngOnInit(): void {
    forkJoin({
      dependencias: this.dependenciasApi.listar(),
      declarante: this.id !== null ? this.declarantesApi.obtener(this.id) : of(null),
    }).subscribe({
      next: ({ dependencias, declarante }) => {
        this.dependencias.set(dependencias.data);
        if (declarante) {
          this.rellenar(declarante.data);
        }
        this.cargando.set(false);
      },
      error: (e) => {
        this.errorCarga.set(mensajeApi(e, 'No fue posible cargar el formulario.'));
        this.cargando.set(false);
      },
    });
  }

  private rellenar(d: Declarante): void {
    const conocido = this.tiposDocumento.some((t) => t.valor === d.tipo_documento);
    if (!conocido && d.tipo_documento) {
      this.tiposExtra.set([d.tipo_documento]);
    }

    this.form.patchValue({
      nombre: d.nombre,
      tipo_documento: d.tipo_documento,
      numero_documento: d.numero_documento,
      cargo: d.cargo,
      id_dependencia: d.id_dependencia,
      direccion: d.direccion ?? '',
      telefono: d.telefono ?? '',
      correo: d.correo ?? '',
    });
  }

  /** Texto de error de un campo (vacío si no hay error o aún no se debe mostrar). */
  mensaje(campo: Campo): string {
    const c = this.form.controls[campo];
    if (!c.invalid || !(c.touched || this.intento())) {
      return '';
    }

    const e = c.errors ?? {};
    if (e['servidor']) return e['servidor'] as string;
    if (e['required']) return 'Este campo es obligatorio.';
    if (e['maxlength']) return `Máximo ${e['maxlength'].requiredLength} caracteres.`;
    if (e['email']) return 'Escribe un correo válido, por ejemplo nombre@dominio.com.';
    if (e['pattern']) {
      return campo === 'numero_documento'
        ? 'Solo letras, números y guion, sin puntos ni espacios.'
        : 'Solo números, espacios y los signos + - ( ).';
    }
    return 'Valor no válido.';
  }

  guardar(): void {
    if (this.guardando()) {
      return;
    }

    this.intento.set(true);
    this.error.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.host.nativeElement.querySelector<HTMLElement>('[formControlName].ng-invalid')?.focus();
      return;
    }

    const v = this.form.getRawValue();
    const datos: DeclaranteEntrada = {
      nombre: v.nombre.trim(),
      tipo_documento: v.tipo_documento,
      numero_documento: v.numero_documento.trim(),
      cargo: v.cargo.trim(),
      id_dependencia: v.id_dependencia as number,
      direccion: v.direccion.trim() || null,
      telefono: v.telefono.trim() || null,
      correo: v.correo.trim() || null,
    };

    this.guardando.set(true);
    const peticion =
      this.id !== null
        ? this.declarantesApi.actualizar(this.id, datos)
        : this.declarantesApi.crear(datos);

    peticion.subscribe({
      next: () => {
        const mensaje = this.editando
          ? `Los datos de ${datos.nombre} se actualizaron correctamente.`
          : `${datos.nombre} se registró correctamente.`;
        void this.router.navigate(['/declarantes'], { state: { mensaje } });
      },
      error: (e) => {
        // La API devuelve errores por campo: se muestran junto a cada campo
        const errores = (e?.error?.errors ?? {}) as Record<string, string>;
        let enCampos = false;
        for (const [campo, texto] of Object.entries(errores)) {
          const control = this.form.get(campo);
          if (control) {
            control.setErrors({ servidor: texto });
            control.markAsTouched();
            enCampos = true;
          }
        }

        this.error.set(
          enCampos
            ? 'Revisa los campos marcados en rojo.'
            : mensajeApi(e, 'No fue posible guardar el declarante.'),
        );
        this.guardando.set(false);
      },
    });
  }

  crearDependencia(): void {
    const nombre = this.nuevaDependencia().trim();
    if (!nombre) {
      this.errorDependencia.set('Escribe el nombre de la dependencia.');
      return;
    }
    if (this.creandoDependencia()) {
      return;
    }

    this.creandoDependencia.set(true);
    this.errorDependencia.set('');

    this.dependenciasApi.crear({ nombre }).subscribe({
      next: (r) => {
        this.dependencias.update((lista) =>
          [...lista, r.data].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
        );
        this.form.controls.id_dependencia.setValue(r.data.id_dependencia);
        this.nuevaDependencia.set('');
        this.mostrarNuevaDependencia.set(false);
        this.creandoDependencia.set(false);
      },
      error: (e) => {
        const detalle = (e?.error?.errors ?? {}) as Record<string, string>;
        this.errorDependencia.set(detalle['nombre'] ?? mensajeApi(e, 'No fue posible crear la dependencia.'));
        this.creandoDependencia.set(false);
      },
    });
  }

  cancelarDependencia(): void {
    this.nuevaDependencia.set('');
    this.errorDependencia.set('');
    this.mostrarNuevaDependencia.set(false);
  }
}
