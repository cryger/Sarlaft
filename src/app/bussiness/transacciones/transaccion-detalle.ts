import { Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { mensajeApi } from '../../core/api.types';
import { AuthService } from '../../core/auth.service';
import { ESTILOS_ESTADO, formatoFecha, formatoFechaHora, formatoMoneda } from '../../core/formato';
import { EstadoFormulario } from '../../shared/services/formulario-api';
import { Transaccion, TransaccionesService } from '../../shared/services/transacciones';

/** Detalle de una transacción: datos, revisión y acciones (aprobar, rechazar, editar, eliminar). */
@Component({
  selector: 'app-transaccion-detalle',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './transaccion-detalle.html',
})
export class TransaccionDetalle implements OnInit {
  private readonly api = inject(TransaccionesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  private readonly dlgRevision = viewChild.required<ElementRef<HTMLDialogElement>>('dlgRevision');
  private readonly dlgEliminar = viewChild.required<ElementRef<HTMLDialogElement>>('dlgEliminar');

  readonly id = Number(this.route.snapshot.paramMap.get('id'));
  readonly estilosEstado = ESTILOS_ESTADO;
  readonly fecha = formatoFecha;
  readonly fechaHora = formatoFechaHora;
  readonly moneda = formatoMoneda;

    /** 2026-10 -> octubre de 2026 */
  periodo(valor: string | null): string {
    if (!valor || !/^\d{4}-\d{2}$/.test(valor)) return valor || '—';
    const [a, m] = valor.split('-');
    return new Date(Number(a), Number(m) - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  }

  t = signal<Transaccion | null>(null);
  cargando = signal(true);
  error = signal('');
  exito = signal('');

  /** Un gestor solo edita mientras la transacción siga pendiente. */
  puedeEditar = computed(() => {
    const t = this.t();
    return !!t && (this.auth.esAdmin() || t.estado === 'Pendiente');
  });

  // ---- Revisión (aprobar / rechazar / volver a pendiente)
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

    this.api.obtener(this.id).subscribe({
      next: (r) => {
        this.t.set(r.data);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeApi(e, 'No fue posible cargar la transacción.'));
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
    this.api.revisar(this.id, modo, texto || undefined).subscribe({
      next: (r) => {
        this.t.set(r.data);
        this.exito.set(
          modo === 'Aprobado'
            ? `La transacción ${r.data.consecutivo} fue aprobada.`
            : modo === 'Rechazado'
              ? `La transacción ${r.data.consecutivo} fue rechazada.`
              : `La transacción ${r.data.consecutivo} volvió a estado pendiente.`,
        );
        this.revisando.set(false);
        this.dlgRevision().nativeElement.close();
      },
      error: (e) => {
        const detalle = (e?.error?.errors ?? {}) as Record<string, string>;
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
    const t = this.t();
    if (!t || this.eliminando()) {
      return;
    }

    this.eliminando.set(true);
    this.errorEliminar.set('');

    this.api.eliminar(this.id).subscribe({
      next: () => {
        void this.router.navigate(['/transacciones'], {
          state: { mensaje: `La transacción ${t.consecutivo} se eliminó correctamente.` },
        });
      },
      error: (e) => {
        this.errorEliminar.set(mensajeApi(e, 'No fue posible eliminar la transacción.'));
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
