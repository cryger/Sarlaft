import { Routes } from '@angular/router';

import { adminGuard, authGuard } from './core/auth.guard';
import { Layout } from './shared/components/layout/layout';
import { DeclaranteForm } from './bussiness/tables/declarantes/declarante-form/declarante-form';
import { Dependencias} from './bussiness/dependencias/dependencias';
import { Usuarios } from './bussiness/usuarios/usuarios';

// Páginas que todavía no existen: comparten una pantalla de "módulo no disponible".
const proximamente = () =>
  import('./bussiness/proximamente/proximamente').then((m) => m.Proximamente);
const declaranteForm = () =>
  import('./bussiness/tables/declarantes/declarante-form/declarante-form').then((m) => m.DeclaranteForm);

const dependencias = () =>
  import('./bussiness/dependencias/dependencias').then((m) => m.Dependencias);

const usuarios = () =>
  import('./bussiness/usuarios/usuarios').then((m) => m.Usuarios);

export const routes: Routes = [
  // Pública
  {
    path: 'login',
    loadComponent: () => import('./bussiness/login/login').then((m) => m.Login),
  },

  // Privadas (requieren sesión)
  {
    path: '',
    component: Layout,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      {
        path: 'dashboard',
        data: { titulo: 'Dashboard' },
        loadComponent: () =>
          import('./bussiness/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'profile',
        data: { titulo: 'Mi perfil' },
        loadComponent: () =>
          import('./bussiness/profile/profile').then((m) => m.Profile),
      },

      // Gestión
      {
        path: 'declarantes',
        data: { titulo: 'Declarantes' },
        loadComponent: () =>
          import('./bussiness/tables/declarantes/declarantes').then(
            (m) => m.DeclarantesComponent,
          ),
      },


      // "nuevo" debe ir antes de ":id"
      { path: 'declarantes/nuevo', data: { titulo: 'Nuevo declarante' }, loadComponent: declaranteForm},
      { path: 'declarantes/:id', data: { titulo: 'Detalle del declarante' }, loadComponent: proximamente },
      { path: 'declarantes/:id/editar', data: { titulo: 'Editar declarante' }, loadComponent: declaranteForm },
      { path: 'dependencias', data: { titulo: 'Dependencias' }, loadComponent: dependencias },
            {
        path: 'usuarios',
        data: { titulo: 'Usuarios' },
        canActivate: [adminGuard],
        loadComponent: () => import('./bussiness/usuarios/usuarios').then((m) => m.Usuarios),
      },

      // Operaciones
      { path: 'transacciones', data: { titulo: 'Transacciones en efectivo' }, loadComponent: proximamente },
      { path: 'ausencias', data: { titulo: 'Ausencias' }, loadComponent: proximamente },
      { path: 'reportes-ros', data: { titulo: 'Reportes ROS' }, loadComponent: proximamente },

      // Sistema
      { path: 'historial', data: { titulo: 'Historial de auditoría' }, canActivate: [adminGuard], loadComponent: proximamente },
    ],
  },

  { path: '**', redirectTo: 'dashboard' },
];
