import {
  Component,
  EventEmitter,
  HostListener,
  OnDestroy,
  OnInit,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';

import { AuthService } from '../../../core/auth.service';
import { ItemNotificacion, Notificaciones, NotificacionesService } from '../../services/notificaciones';

type Panel = 'notificaciones' | 'configuracion' | null;

/** Cada cuánto se consultan las notificaciones mientras la pantalla está abierta. */
const CADA_MS = 120_000;
/** Mínimo entre dos consultas seguidas (para no consultar en cada clic de navegación). */
const ENTRE_CONSULTAS_MS = 15_000;

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.html',
})
export class Header implements OnInit, OnDestroy {
  @Output() menuToggle = new EventEmitter<void>();

  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificacionesApi = inject(NotificacionesService);

  titulo = signal('Dashboard');

  /** Solo uno de los dos paneles puede estar abierto. */
  panel = signal<Panel>(null);
  datos = signal<Notificaciones | null>(null);

  /** Notificaciones que el gestor ya vio (se recuerdan en este navegador). */
  private readonly claveVisto = `sarlaft_notif_vistas_${this.auth.usuario()?.usuario ?? ''}`;
  private readonly vistas = signal<Set<string>>(this.leerVistas());
  /** Lo que ya estaba visto cuando se abrió la campana (para resaltar solo lo nuevo mientras está abierta). */
  private readonly vistasAlAbrir = signal<Set<string>>(this.leerVistas());

  private temporizador?: ReturnType<typeof setInterval>;
  private ultimaConsulta = 0;

  /** Número que se muestra sobre la campana. */
  sinLeer = computed(() => {
    const d = this.datos();
    if (!d) return 0;
    // Administrador: son pendientes por revisar, el número baja cuando los revisa.
    if (d.rol === 'Administrador') return d.pendientes_total ?? 0;
    // Gestor: lo revisado después de la última vez que abrió la campana.
    return d.items.filter((i) => !this.vistas().has(this.clave(i))).length;
  });

  etiquetaCampana = computed(() => {
    const n = this.sinLeer();
    if (n === 0) return 'Notificaciones';
    return this.datos()?.rol === 'Administrador'
      ? `Notificaciones, ${n} ${n === 1 ? 'formulario pendiente' : 'formularios pendientes'} de revisión`
      : `Notificaciones, ${n} sin leer`;
  });

  /** Opciones de la rueda de configuración según el rol. */
  menuConfiguracion = computed(() => [
    { etiqueta: 'Mi perfil y contraseña', ayuda: 'Tus datos, tu contraseña y tu actividad', ruta: '/profile' },
    ...(this.auth.esAdmin()
      ? [
          { etiqueta: 'Usuarios', ayuda: 'Crear, activar y desactivar usuarios', ruta: '/usuarios' },
          { etiqueta: 'Dependencias', ayuda: 'Áreas del hospital', ruta: '/dependencias' },
          { etiqueta: 'Historial de auditoría', ayuda: 'Quién hizo qué y cuándo', ruta: '/historial' },
        ]
      : []),
  ]);

  constructor() {
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => {
        let ruta = this.router.routerState.snapshot.root;
        while (ruta.firstChild) ruta = ruta.firstChild;
        this.titulo.set(ruta.data['titulo'] ?? 'Dashboard');
        this.cerrar();
        // Al navegar (por ejemplo después de aprobar algo) se actualiza el número de la campana
        if (Date.now() - this.ultimaConsulta > ENTRE_CONSULTAS_MS) this.cargar();
      });
  }

  ngOnInit(): void {
    this.cargar();
    this.temporizador = setInterval(() => this.cargar(), CADA_MS);
  }

  ngOnDestroy(): void {
    clearInterval(this.temporizador);
  }

  // ------------------------------------------------------------------ paneles

  alternar(cual: Exclude<Panel, null>): void {
    const abrir = this.panel() !== cual;
    this.panel.set(abrir ? cual : null);

    if (abrir && cual === 'notificaciones') {
      this.vistasAlAbrir.set(this.vistas());
      this.cargar();
      this.marcarVistas();
    }
  }

  cerrar(): void {
    this.panel.set(null);
  }

  /** Cierra el panel al hacer clic fuera de él. */
  @HostListener('document:click', ['$event'])
  alHacerClic(evento: MouseEvent): void {
    if (this.panel() && !(evento.target as HTMLElement).closest('[data-panel-raiz]')) {
      this.cerrar();
    }
  }

  @HostListener('document:keydown.escape')
  alPresionarEscape(): void {
    this.cerrar();
  }

  // ------------------------------------------------------------- notificaciones

  cargar(): void {
    this.ultimaConsulta = Date.now();
    this.notificacionesApi.obtener().subscribe({
      next: (r) => {
        this.datos.set(r.data);
        // Si la campana está abierta cuando llegan datos nuevos, también se dan por vistos
        if (this.panel() === 'notificaciones') this.marcarVistas();
      },
      error: () => undefined, // sin notificaciones no pasa nada: la pantalla sigue funcionando
    });
  }

  /** Identifica una notificación: el mismo formulario con otro estado cuenta como notificación nueva. */
  private clave(i: ItemNotificacion): string {
    return `${i.ruta}:${i.id}:${i.estado ?? ''}:${i.fecha}`;
  }

  private leerVistas(): Set<string> {
    try {
      return new Set<string>(JSON.parse(localStorage.getItem(this.claveVisto) ?? '[]'));
    } catch {
      return new Set<string>();
    }
  }

  /** El gestor ya vio lo que hay: el número vuelve a cero hasta que llegue algo nuevo. */
  private marcarVistas(): void {
    const items = this.datos()?.items ?? [];
    if (this.datos()?.rol !== 'Gestor' || items.length === 0) return;

    // Lo más reciente primero; se guardan como máximo 100 para que la lista no crezca sin fin
    const todas = [...new Set([...items.map((i) => this.clave(i)), ...this.vistas()])].slice(0, 100);
    this.vistas.set(new Set(todas));
    try {
      localStorage.setItem(this.claveVisto, JSON.stringify(todas));
    } catch {
      /* si el navegador no deja guardar, solo se pierde el recordatorio */
    }
  }

  esNueva(i: ItemNotificacion): boolean {
    return !this.vistasAlAbrir().has(this.clave(i));
  }

  /** "hace 5 min", "hace 2 h", "hace 3 días" */
  hace(segundos: number): string {
    const minutos = Math.round(segundos / 60);
    if (minutos < 1) return 'ahora mismo';
    if (minutos < 60) return `hace ${minutos} min`;
    const horas = Math.round(minutos / 60);
    if (horas < 24) return `hace ${horas} h`;
    const dias = Math.round(horas / 24);
    return `hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
  }

  // ---------------------------------------------------------------------- menú

  abrirMenu(): void {
    this.menuToggle.emit();
  }

  salir(): void {
    this.auth.logout();
  }
}
