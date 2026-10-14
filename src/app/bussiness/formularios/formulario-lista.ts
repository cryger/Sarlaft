import { Component, OnDestroy, OnInit, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { mensajeApi } from '../../core/api.types';
import { AuthService } from '../../core/auth.service';
import { ESTILOS_ESTADO } from '../../core/formato';
import { FormularioApi, FormularioBase } from '../../shared/services/formulario-api';
import { ConfigLista } from './formulario-config';

/**
 * Lista genérica de un formulario SARLAFT (ausencias, ROS, ...):
 * búsqueda, filtros por estado y fechas, y paginación resueltos en la API.
 */
@Component({
  selector: 'app-formulario-lista',
  imports: [RouterLink],
  templateUrl: './formulario-lista.html',
})
export class FormularioLista implements OnInit, OnDestroy {
  readonly config = input.required<ConfigLista<any>>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly api = input.required<FormularioApi<any, any>>();

  readonly auth = inject(AuthService);
  readonly estilosEstado = ESTILOS_ESTADO;
  readonly opcionesPorPagina = [10, 20, 50];

  filas = signal<FormularioBase[]>([]);
  total = signal(0);
  cargando = signal(true);
  error = signal('');
  exito = signal('');

  termino = signal('');
  estado = signal('');
  desde = signal('');
  hasta = signal('');
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
    this.peticion = this.api()
      .listar({
        q: this.termino().trim(),
        estado: this.estado(),
        desde: this.desde(),
        hasta: this.hasta(),
        limit: porPagina,
        offset: (this.pagina() - 1) * porPagina,
      })
      .subscribe({
        next: (r: { data: FormularioBase[]; meta?: { total: number } }) => {
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
        error: (e: unknown) => {
          this.error.set(mensajeApi(e, 'No fue posible cargar la lista.'));
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

  /** Los gestores solo editan mientras el formulario siga pendiente. */
  puedeEditar(f: FormularioBase): boolean {
    return this.auth.esAdmin() || f.estado === 'Pendiente';
  }
}
