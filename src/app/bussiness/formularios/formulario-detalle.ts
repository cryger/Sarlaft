import { Component, ElementRef, OnInit, computed, inject, input, signal, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { mensajeApi } from '../../core/api.types';
import { AuthService } from '../../core/auth.service';
import { ESTILOS_ESTADO, formatoFechaHora } from '../../core/formato';
import { EstadoFormulario, FormularioApi, FormularioBase } from '../../shared/services/formulario-api';
import { ConfigDetalle } from './formulario-config';

/**
 * Detalle genérico de un formulario SARLAFT: datos por secciones, revisión
 * (aprobar, rechazar, volver a pendiente), edición y eliminación.
 */
@Component({
  selector: 'app-formulario-detalle',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './formulario-detalle.html',
})
export class FormularioDetalle implements OnInit {
  readonly config = input.required<ConfigDetalle<any>>();
  readonly api = input.required<FormularioApi<any, any>>();

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  private readonly dlgRevision = viewChild.required<ElementRef<HTMLDialogElement>>('dlgRevision');
  private readonly dlgEliminar = viewChild.required<ElementRef<HTMLDialogElement>>('dlgEliminar');

  readonly id = Number(this.route.snapshot.paramMap.get('id'));
  readonly estilosEstado = ESTILOS_ESTADO;
  readonly fechaHora = formatoFechaHora;

  f = signal<FormularioBase | null>(null);
  cargando = signal(true);
  error = signal('');
  exito = signal('');

  /** "La ausencia" / "El reporte" */
  articulo = computed(() => (this.config().femenino ? 'La' : 'El'));
  /** "aprobada" / "aprobado" */
  participio = (base: string) => base + (this.config().femenino ? 'a' : 'o');

  /** Un gestor solo edita mientras el formulario siga pendiente. */
  puedeEditar = computed(() => {
    const f = this.f();
    return !!f && (this.auth.esAdmin() || f.estado === 'Pendiente');
  });

  // ---- Revisión
  modo = signal<EstadoFormulario>('Aprobado');
  readonly observacion = new FormControl('', { nonNullable: true });
  intentoRevision = signal(false);
  revisando = signal(false);
  errorRevision = signal('');

  // ---- Eliminar
  eliminando = signal(false);
  errorEliminar = signal('');

  ngOnInit(): void {
    if (typeof history !== 'undefined') {
      const mensaje = (history.state as { mensaje?: string } | null)?.mensaje;
      if (mensaje) {
        this.exito.set(mensaje);
        history.replaceState({ ...history.state, mensaje: undefined }, '');
      }
    }
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');

    this.api()
      .obtener(this.id)
      .subscribe({
        next: (r: { data: FormularioBase }) => {
          this.f.set(r.data);
          this.cargando.set(false);
        },
        error: (e: unknown) => {
          this.error.set(mensajeApi(e, 'No fue posible cargar el registro.'));
          this.cargando.set(false);
        },
      });
  }

  // ------------------------------------------------------------------ revisión

  abrirRevision(modo: EstadoFormulario): void {
    this.exito.set('');
    this.modo.set(modo);
    this.observacion.reset('');
    this.intentoRevision.set(false);
    this.errorRevision.set('');
    this.dlgRevision().nativeElement.showModal();
  }

  /** Para rechazar es obligatorio explicar el motivo. */
  falta(): boolean {
    return this.modo() === 'Rechazado' && this.intentoRevision() && !this.observacion.value.trim();
  }

  confirmarRevision(): void {
    if (this.revisando()) {
      return;
    }

    this.intentoRevision.set(true);
    this.errorRevision.set('');

    const texto = this.observacion.value.trim();
    if (this.modo() === 'Rechazado' && !texto) {
      return;
    }

    const modo = this.modo();
    this.revisando.set(true);
    this.api()
      .revisar(this.id, modo, texto || undefined)
      .subscribe({
        next: (r: { data: FormularioBase }) => {
          this.f.set(r.data);
          const quien = `${this.articulo()} ${this.config().sustantivo} ${r.data.consecutivo}`;
          this.exito.set(
            modo === 'Aprobado'
              ? `${quien} fue ${this.participio('aprobad')}.`
              : modo === 'Rechazado'
                ? `${quien} fue ${this.participio('rechazad')}.`
                : `${quien} volvió a estado pendiente.`,
          );
          this.revisando.set(false);
          this.dlgRevision().nativeElement.close();
        },
        error: (e: { error?: { errors?: Record<string, string> } }) => {
          const detalle = e?.error?.errors ?? {};
          this.errorRevision.set(detalle['observacion'] ?? mensajeApi(e, 'No fue posible guardar la revisión.'));
          this.revisando.set(false);
        },
      });
  }

  // ------------------------------------------------------------------ eliminar

  pedirEliminar(): void {
    this.exito.set('');
    this.errorEliminar.set('');
    this.dlgEliminar().nativeElement.showModal();
  }

  confirmarEliminar(): void {
    const f = this.f();
    if (!f || this.eliminando()) {
      return;
    }

    this.eliminando.set(true);
    this.errorEliminar.set('');

    this.api()
      .eliminar(this.id)
      .subscribe({
        next: () => {
          void this.router.navigate([this.config().ruta], {
            state: {
              mensaje: `${this.articulo()} ${this.config().sustantivo} ${f.consecutivo} se eliminó correctamente.`,
            },
          });
        },
        error: (e: unknown) => {
          this.errorEliminar.set(mensajeApi(e, 'No fue posible eliminar el registro.'));
          this.eliminando.set(false);
        },
      });
  }

  /** Cierra la ventana si se hace clic en el fondo oscuro (no dentro del contenido). */
  clicEnFondo(evento: MouseEvent, dialogo: HTMLDialogElement): void {
    if (evento.target === dialogo) {
      dialogo.close();
    }
  }
}
