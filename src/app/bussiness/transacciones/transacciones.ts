import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { mensajeApi } from '../../core/api.types';
import { AuthService } from '../../core/auth.service';
import { ESTILOS_ESTADO, formatoFecha, formatoMoneda } from '../../core/formato';
import { Transaccion, TransaccionesService } from '../../shared/services/transacciones';

/** Lista de transacciones en efectivo con búsqueda, filtros y paginación (todo se resuelve en la API). */
@Component({
  selector: 'app-transacciones',
  imports: [RouterLink],
  templateUrl: './transacciones.html',
})
export class Transacciones implements OnInit, OnDestroy {
  private readonly api = inject(TransaccionesService);
  readonly auth = inject(AuthService);

  readonly estilosEstado = ESTILOS_ESTADO;
  readonly fecha = formatoFecha;
  readonly moneda = formatoMoneda;
  readonly opcionesPorPagina = [10, 20, 50];

  filas = signal<Transaccion[]>([]);
  total = signal(0);
  cargando = signal(true);
  error = signal('');
  exito = signal('');

  // Filtros
  termino = signal('');
  estado = signal('');
  desde = signal('');
  hasta = signal('');

  // Paginación
  pagina = signal(1);
  porPagina = signal(10);

  totalPaginas = computed(() => Math.max(1, Math.ceil(this.total() / this.porPagina())));
  primeraFila = computed(() => (this.total() === 0 ? 0 : (this.pagina() - 1) * this.porPagina() + 1));
  ultimaFila = computed(() => Math.min(this.total(), this.pagina() * this.porPagina()));
  hayFiltros = computed(() => !!(this.termino().trim() || this.estado() || this.desde() || this.hasta()));
  rangoInvalido = computed(() => !!this.desde() && !!this.hasta() && this.desde() > this.hasta());

  private peticion?: Subscription;
  private temporizador?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    // Mensaje que dejan el formulario o el detalle (se muestra una sola vez)
    if (typeof history !== 'undefined') {
      const mensaje = (history.state as { mensaje?: string } | null)?.mensaje;
      if (mensaje) {
        this.exito.set(mensaje);
        history.replaceState({ ...history.state, mensaje: undefined }, '');
      }
    }
    this.cargar();
  }

  ngOnDestroy(): void {
    clearTimeout(this.temporizador);
    this.peticion?.unsubscribe();
  }

  cargar(): void {
    this.peticion?.unsubscribe(); // si hay una consulta anterior en curso, se descarta
    this.cargando.set(true);
    this.error.set('');

    const porPagina = this.porPagina();
    this.peticion = this.api
      .listar({
        q: this.termino().trim(),
        estado: this.estado(),
        desde: this.desde(),
        hasta: this.hasta(),
        limit: porPagina,
        offset: (this.pagina() - 1) * porPagina,
      })
      .subscribe({
        next: (r) => {
          const total = r.meta?.total ?? r.data.length;
          const ultima = Math.max(1, Math.ceil(total / porPagina));
          if (this.pagina() > ultima) {
            this.pagina.set(ultima);
            this.cargar();
            return;
          }
          this.filas.set(r.data);
          this.total.set(total);
          this.cargando.set(false);
        },
        error: (e) => {
          this.error.set(mensajeApi(e, 'No fue posible cargar las transacciones.'));
          this.cargando.set(false);
        },
      });
  }

  /** Espera un instante a que termines de escribir antes de consultar. */
  buscar(valor: string): void {
    this.termino.set(valor);
    clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => {
      this.pagina.set(1);
      this.cargar();
    }, 300);
  }

  filtrar(campo: 'estado' | 'desde' | 'hasta', valor: string): void {
    this[campo].set(valor);
    this.pagina.set(1);
    this.cargar();
  }

  limpiarFiltros(): void {
    clearTimeout(this.temporizador);
    this.termino.set('');
    this.estado.set('');
    this.desde.set('');
    this.hasta.set('');
    this.pagina.set(1);
    this.cargar();
  }

  irA(pagina: number): void {
    const destino = Math.min(Math.max(1, pagina), this.totalPaginas());
    if (destino !== this.pagina()) {
      this.pagina.set(destino);
      this.cargar();
    }
  }

  cambiarPorPagina(valor: string): void {
    this.porPagina.set(Number(valor));
    this.pagina.set(1);
    this.cargar();
  }

  /** Los gestores solo editan mientras la transacción siga pendiente. */
  puedeEditar(t: Transaccion): boolean {
    return this.auth.esAdmin() || t.estado === 'Pendiente';
  }
}
