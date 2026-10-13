import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { mensajeApi } from '../../core/api.types';
import { AuthService } from '../../core/auth.service';
import { StatCard } from '../../shared/components/stat-card/stat-card';
import { DashboardData, DashboardService } from '../../shared/services/dashboard';

interface Indicador {
  titulo: string;
  valor: number;
  icono: string;
  descripcion: string;
}

function textoPendientes(n: number): string {
  if (n === 0) return 'Sin pendientes de revisión';
  return n === 1 ? '1 pendiente de revisión' : `${n} pendientes de revisión`;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, StatCard],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  private readonly api = inject(DashboardService);
  readonly auth = inject(AuthService);

  cargando = signal(true);
  error = signal('');
  datos = signal<DashboardData | null>(null);

  indicadores = computed<Indicador[]>(() => {
    const d = this.datos();
    if (!d) return [];
    const i = d.indicadores;
    return [
      { titulo: 'Declarantes', valor: i.declarantes, icono: '♙', descripcion: 'Registrados en el sistema' },
      { titulo: 'Transacciones en efectivo', valor: i.transacciones.total, icono: '$', descripcion: textoPendientes(i.transacciones.pendientes) },
      { titulo: 'Ausencias registradas', valor: i.ausencias.total, icono: '▣', descripcion: textoPendientes(i.ausencias.pendientes) },
      { titulo: 'Reportes ROS', valor: i.ros.total, icono: '▤', descripcion: textoPendientes(i.ros.pendientes) },
    ];
  });

  actividad = computed(() => this.datos()?.actividad ?? []);
  resumen = computed(() => this.datos()?.resumen ?? []);
  pendientes = computed(() => this.datos()?.pendientes ?? 0);

  corte = computed(() => {
    const f = this.datos()?.fecha_corte;
    if (!f) return '';
    return new Date(`${f}T00:00:00`).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  });

  estilosEstado: Record<string, string> = {
    Pendiente: 'from-orange-600 to-orange-400',
    Aprobado: 'from-green-600 to-green-400',
    Rechazado: 'from-red-600 to-red-400',
  };

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');

    this.api.obtener().subscribe({
      next: (r) => {
        this.datos.set(r.data);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeApi(e, 'No fue posible cargar el resumen.'));
        this.cargando.set(false);
      },
    });
  }

  /** 2026-10-07 -> 07/10/2026 */
  fecha(iso: string): string {
    const [a, m, d] = (iso ?? '').slice(0, 10).split('-');
    return a && m && d ? `${d}/${m}/${a}` : iso;
  }
}
