import { Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { mensajeApi } from '../../core/api.types';
import { AuthService } from '../../core/auth.service';
import { Dependencia, DependenciasService } from '../../shared/services/dependencias';

/** Rechaza textos que solo tienen espacios. */
function noVacio(control: AbstractControl): ValidationErrors | null {
  const v = control.value;
  return typeof v === 'string' && v.length > 0 && v.trim() === '' ? { required: true } : null;
}

/** Para buscar sin importar tildes ni mayúsculas ("tesoreria" encuentra "Tesorería"). */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

const porNombre = (a: Dependencia, b: Dependencia) => a.nombre.localeCompare(b.nombre, 'es');

@Component({
  selector: 'app-dependencias',
  imports: [ReactiveFormsModule],
  templateUrl: './dependencias.html',
})
export class Dependencias implements OnInit {
  private readonly api = inject(DependenciasService);
  readonly auth = inject(AuthService);

  private readonly dlgForm = viewChild.required<ElementRef<HTMLDialogElement>>('dlgForm');
  private readonly dlgEliminar = viewChild.required<ElementRef<HTMLDialogElement>>('dlgEliminar');

  // Lista
  dependencias = signal<Dependencia[]>([]);
  cargando = signal(true);
  error = signal('');
  exito = signal('');
  termino = signal('');

  filtradas = computed(() => {
    const t = normalizar(this.termino().trim());
    const lista = this.dependencias();
    return t ? lista.filter((d) => normalizar(d.nombre).includes(t)) : lista;
  });

  // Ventana de crear / editar
  seleccionada = signal<Dependencia | null>(null); // null = crear
  guardando = signal(false);
  errorForm = signal('');
  intento = signal(false);
  readonly nombre = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, noVacio, Validators.maxLength(150)],
  });

  // Ventana de eliminar
  aEliminar = signal<Dependencia | null>(null);
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
        this.dependencias.set(r.data);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeApi(e, 'No fue posible cargar las dependencias.'));
        this.cargando.set(false);
      },
    });
  }

  // ------------------------------------------------------------ crear / editar

  abrirCrear(): void {
    this.abrirForm(null);
  }

  abrirEditar(d: Dependencia): void {
    this.abrirForm(d);
  }

  private abrirForm(d: Dependencia | null): void {
    this.exito.set('');
    this.seleccionada.set(d);
    this.nombre.reset(d?.nombre ?? '');
    this.nombre.markAsUntouched();
    this.intento.set(false);
    this.errorForm.set('');
    this.dlgForm().nativeElement.showModal();
  }

  mensajeNombre(): string {
    if (!this.nombre.invalid || !(this.nombre.touched || this.intento())) {
      return '';
    }
    const e = this.nombre.errors ?? {};
    if (e['servidor']) return e['servidor'] as string;
    if (e['required']) return 'Escribe el nombre de la dependencia.';
    if (e['maxlength']) return `Máximo ${e['maxlength'].requiredLength} caracteres.`;
    return 'Valor no válido.';
  }

  guardar(): void {
    if (this.guardando()) {
      return;
    }

    this.intento.set(true);
    this.errorForm.set('');

    if (this.nombre.invalid) {
      this.nombre.markAsTouched();
      return;
    }

    const nombre = this.nombre.value.trim();
    const actual = this.seleccionada();
    const peticion = actual
      ? this.api.actualizar(actual.id_dependencia, { nombre })
      : this.api.crear({ nombre });

    this.guardando.set(true);
    peticion.subscribe({
      next: (r) => {
        this.dependencias.update((lista) =>
          (actual
            ? lista.map((d) => (d.id_dependencia === actual.id_dependencia ? r.data : d))
            : [...lista, r.data]
          ).sort(porNombre),
        );
        this.exito.set(
          actual
            ? `La dependencia «${nombre}» se actualizó correctamente.`
            : `La dependencia «${nombre}» se creó correctamente.`,
        );
        this.guardando.set(false);
        this.dlgForm().nativeElement.close();
      },
      error: (e) => {
        const detalle = (e?.error?.errors ?? {}) as Record<string, string>;
        if (detalle['nombre']) {
          this.nombre.setErrors({ servidor: detalle['nombre'] });
          this.nombre.markAsTouched();
        } else {
          this.errorForm.set(mensajeApi(e, 'No fue posible guardar la dependencia.'));
        }
        this.guardando.set(false);
      },
    });
  }

  // ------------------------------------------------------------------ eliminar

  pedirEliminar(d: Dependencia): void {
    this.exito.set('');
    this.aEliminar.set(d);
    this.errorEliminar.set('');
    this.dlgEliminar().nativeElement.showModal();
  }

  confirmarEliminar(): void {
    const d = this.aEliminar();
    if (!d || this.eliminando()) {
      return;
    }

    this.eliminando.set(true);
    this.errorEliminar.set('');

    this.api.eliminar(d.id_dependencia).subscribe({
      next: () => {
        this.dependencias.update((lista) => lista.filter((x) => x.id_dependencia !== d.id_dependencia));
        this.exito.set(`La dependencia «${d.nombre}» se eliminó correctamente.`);
        this.eliminando.set(false);
        this.dlgEliminar().nativeElement.close();
      },
      error: (e) => {
        this.errorEliminar.set(mensajeApi(e, 'No fue posible eliminar la dependencia.'));
        this.eliminando.set(false);
      },
    });
  }

  // ------------------------------------------------------------------- común

  /** Cierra la ventana si se hace clic en el fondo oscuro (no dentro del contenido). */
  clicEnFondo(evento: MouseEvent, dialogo: HTMLDialogElement): void {
    if (evento.target === dialogo) {
      dialogo.close();
    }
  }
}
