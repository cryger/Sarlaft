import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { mensajeApi } from '../../core/api.types';
import { formatoFecha } from '../../core/formato';
import { HistorialService, RegistroHistorial } from '../../shared/services/historial';
import { Usuario, UsuariosService } from '../../shared/services/usuarios';

/** Módulos que registran movimientos (los nombres los define la API). */
const MODULOS = [
  'Autenticación',
  'Declarantes',
  'Dependencias',
  'Usuarios',
  'Transacciones en efectivo',
  'Ausencia de transacciones',
  'Reportes ROS',
  'Transacciones múltiples',
];

const ACCIONES = [
  'Inicio de sesión',
  'Creación',
  'Actualización',
  'Eliminación',
  'Revisión: Aprobado',
  'Revisión: Rechazado',
  'Revisión: Pendiente',
];

/** Pantalla donde se abre el registro afectado (si todavía existe y tiene pantalla). */
const RUTAS: Record<string, (id: number) => string[]> = {
  'Transacciones en efectivo': (id) => ['/transacciones', String(id)],
  'Ausencia de transacciones': (id) => ['/ausencias', String(id)],
  'Reportes ROS': (id) => ['/reportes-ros', String(id)],
  'Transacciones múltiples': (id) => ['/transacciones-multiples', String(id)],
  Declarantes: (id) => ['/declarantes', String(id), 'editar'],
};

/** Historial de auditoría: solo lectura, solo administradores. */
@Component({
  selector: 'app-historial',
  imports: [RouterLink],
  templateUrl: './historial.html',
})
export class Historial implements OnInit, OnDestroy {
  private readonly api = inject(HistorialService);
  private readonly usuariosApi = inject(UsuariosService);

  readonly modulos = MODULOS;
  readonly acciones = ACCIONES;
  readonly opcionesPorPagina = [10, 20, 50, 100];

  filas = signal<RegistroHistorial[]>([]);
  usuarios = signal<Usuario[]>([]);
  total = signal(0);
  cargando = signal(true);
  error = signal('');

  // Filtros
  termino = signal('');
  modulo = signal('');
  accion = signal('');
  usuario = signal('');
  desde = signal('');
  hasta = signal('');

  // Paginación
  pagina = signal(1);
  porPagina = signal(20);

  totalPaginas = computed(() => Math.max(1, Math.ceil(this.total() / this.porPagina())));
  primeraFila = computed(() => (this.total() === 0 ? 0 : (this.pagina() - 1) * this.porPagina() + 1));
  ultimaFila = computed(() => Math.min(this.total(), this.pagina() * this.porPagina()));
  hayFiltros = computed(
    () => !!(this.termino().trim() || this.modulo() || this.accion() || this.usuario() || this.desde() || this.hasta()),
  );
  rangoInvalido = computed(() => !!this.desde() && !!this.hasta() && this.desde() > this.hasta());

  private peticion?: Subscription;
  private temporizador?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    // La lista de usuarios solo sirve para el filtro: si falla, el historial igual funciona
    this.usuariosApi.listar({ limit: 1000 }).subscribe({
      next: (r) => this.usuarios.set(r.data),
      error: () => undefined,
    });
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
        modulo: this.modulo(),
        accion: this.accion(),
        usuario: this.usuario(),
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
          this.error.set(mensajeApi(e, 'No fue posible cargar el historial.'));
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

  filtrar(campo: 'modulo' | 'accion' | 'usuario' | 'desde' | 'hasta', valor: string): void {
    this[campo].set(valor);
    this.pagina.set(1);
    this.cargar();
  }

  limpiarFiltros(): void {
    clearTimeout(this.temporizador);
    this.termino.set('');
    this.modulo.set('');
    this.accion.set('');
    this.usuario.set('');
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

  // --------------------------------------------------------------- formato

  /** 07/10/2026 15:30:12 (en auditoría importan los segundos). */
  fechaHora(valor: string): string {
    return `${formatoFecha(valor)} ${valor.slice(11, 19)}`.trim();
  }

  /** Texto del detalle: lo que registró la API o, si no hay, una descripción por defecto. */
  detalle(r: RegistroHistorial): string {
    return r.observaciones || (r.modulo === 'Autenticación' ? 'Sesión iniciada' : `#${r.registro}`);
  }

  /** Color de la etiqueta según la acción. */
  estiloAccion(accion: string): string {
    if (accion === 'Eliminación' || accion === 'Revisión: Rechazado') return 'from-red-600 to-red-400';
    if (accion === 'Creación' || accion === 'Revisión: Aprobado') return 'from-green-600 to-green-400';
    if (accion === 'Actualización') return 'from-blue-600 to-blue-400';
    if (accion === 'Revisión: Pendiente') return 'from-orange-600 to-orange-400';
    return 'from-gray-500 to-gray-400'; // inicio de sesión y otras
  }

  /** Enlace al registro afectado; no existe si fue eliminado o si el módulo no tiene pantalla. */
  enlace(r: RegistroHistorial): string[] | null {
    if (r.accion === 'Eliminación') return null;
    return RUTAS[r.modulo]?.(r.registro) ?? null;
  }
}
