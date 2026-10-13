import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../../core/auth.service';

interface ItemMenu {
  ruta: string;
  etiqueta: string;
  icono: string;
  /** Solo lo ven los administradores */
  soloAdmin?: boolean;
}

interface SeccionMenu {
  titulo: string;
  items: ItemMenu[];
}

const MENU: SeccionMenu[] = [
  {
    titulo: 'Principal',
    items: [
      { ruta: '/dashboard', etiqueta: 'Dashboard', icono: '⌂' },
      { ruta: '/profile', etiqueta: 'Mi perfil', icono: '♙' },
    ],
  },
  {
    titulo: 'Gestión',
    items: [
      { ruta: '/declarantes', etiqueta: 'Declarantes', icono: '♙' },
      { ruta: '/dependencias', etiqueta: 'Dependencias', icono: '▦' },
      { ruta: '/usuarios', etiqueta: 'Usuarios', icono: '♧', soloAdmin: true },
    ],
  },
  {
    titulo: 'Operaciones',
    items: [
      { ruta: '/transacciones', etiqueta: 'Transacciones en efectivo', icono: '$' },
      { ruta: '/ausencias', etiqueta: 'Ausencias', icono: '▣' },
      { ruta: '/reportes-ros', etiqueta: 'Reportes ROS', icono: '▤' },
    ],
  },
  {
    titulo: 'Sistema',
    items: [
      { ruta: '/historial', etiqueta: 'Historial de auditoría', icono: '◷', soloAdmin: true },
    ],
  },
];

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
})
export class Sidebar {
  @Input() open = false;
  @Output() closeMenu = new EventEmitter<void>();

  private readonly auth = inject(AuthService);

  /** Menú según el rol del usuario (los gestores no ven Usuarios ni Historial). */
  get secciones(): SeccionMenu[] {
    const admin = this.auth.esAdmin();
    return MENU.map((s) => ({
      ...s,
      items: s.items.filter((i) => admin || !i.soloAdmin),
    })).filter((s) => s.items.length > 0);
  }

  cerrarMenu(): void {
    this.closeMenu.emit();
  }
}
