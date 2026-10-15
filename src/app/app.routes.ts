import { Routes } from '@angular/router';

import { adminGuard, authGuard,rosListaGuard } from './core/auth.guard';
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
            {
        path: 'transacciones',
        data: { titulo: 'Transacciones en efectivo' },
        loadComponent: () => import('./bussiness/transacciones/transacciones').then((m) => m.Transacciones),
      },
      {
        path: 'transacciones/nuevo',
        data: { titulo: 'Nueva transacción' },
        loadComponent: () => import('./bussiness/transacciones/transaccion-form').then((m) => m.TransaccionForm),
      },
      {
        path: 'transacciones/:id',
        data: { titulo: 'Detalle de la transacción' },
        loadComponent: () =>
          import('./bussiness/transacciones/transaccion-detalle').then((m) => m.TransaccionDetalle),
      },
      {
        path: 'transacciones/:id/editar',
        data: { titulo: 'Editar transacción' },
        loadComponent: () => import('./bussiness/transacciones/transaccion-form').then((m) => m.TransaccionForm),
      },
            {
        path: 'ausencias',
        data: { titulo: 'Ausencia de transacciones' },
        loadComponent: () => import('./bussiness/ausencias/ausencias').then((m) => m.Ausencias),
      },
      {
        path: 'ausencias/nuevo',
        data: { titulo: 'Nuevo reporte de ausencia' },
        loadComponent: () => import('./bussiness/ausencias/ausencias-form').then((m) => m.AusenciaForm),
      },
      {
        path: 'ausencias/:id',
        data: { titulo: 'Detalle de ausencia' },
        loadComponent: () => import('./bussiness/ausencias/ausencias-detalle').then((m) => m.AusenciaDetalle),
      },
      {
        path: 'ausencias/:id/editar',
        data: { titulo: 'Editar ausencia' },
        loadComponent: () => import('./bussiness/ausencias/ausencias-form').then((m) => m.AusenciaForm),
      },
            // ROS: cualquier usuario puede enviarlo, pero solo el administrador lo consulta
      {
        path: 'reportes-ros',
        data: { titulo: 'Reportes ROS' },
        canActivate: [rosListaGuard],
        loadComponent: () => import('./bussiness/reportes-ros/reportes-ros').then((m) => m.ReportesRos),
      },
      {
        path: 'reportes-ros/nuevo',
        data: { titulo: 'Nuevo reporte ROS' },
        loadComponent: () => import('./bussiness/reportes-ros/ros-form').then((m) => m.RosForm),
      },
      {
        path: 'reportes-ros/:id',
        data: { titulo: 'Detalle del reporte ROS' },
        canActivate: [adminGuard],
        loadComponent: () => import('./bussiness/reportes-ros/ros-detalle').then((m) => m.RosDetalle),
      },
      {
        path: 'reportes-ros/:id/editar',
        data: { titulo: 'Editar reporte ROS' },
        canActivate: [adminGuard],
        loadComponent: () => import('./bussiness/reportes-ros/ros-form').then((m) => m.RosForm),
      },

            {
        path: 'transacciones-multiples',
        data: { titulo: 'Transacciones múltiples' },
        loadComponent: () => import('./bussiness/multiples/multiples').then((m) => m.Multiples),
      },
      // "nuevo" debe ir antes de ":id"
      {
        path: 'transacciones-multiples/nuevo',
        data: { titulo: 'Nuevo reporte de transacciones múltiples' },
        loadComponent: () => import('./bussiness/multiples/multiple-form').then((m) => m.MultipleForm),
      },
      {
        path: 'transacciones-multiples/:id',
        data: { titulo: 'Detalle de transacciones múltiples' },
        loadComponent: () => import('./bussiness/multiples/multiple-detalle').then((m) => m.MultipleDetalle),
      },
      {
        path: 'transacciones-multiples/:id/editar',
        data: { titulo: 'Editar transacciones múltiples' },
        loadComponent: () => import('./bussiness/multiples/multiple-form').then((m) => m.MultipleForm),
      },

            {
        path: 'vinculacion-terceros',
        data: { titulo: 'Vinculación de terceros' },
        loadComponent: () => import('./bussiness/vinculacion/vinculaciones').then((m) => m.Vinculaciones),
      },
      // "nuevo" debe ir antes de ":id"
      {
        path: 'vinculacion-terceros/nuevo',
        data: { titulo: 'Nueva vinculación de terceros' },
        loadComponent: () => import('./bussiness/vinculacion/vinculacion-form').then((m) => m.VinculacionForm),
      },
      {
        path: 'vinculacion-terceros/:id',
        data: { titulo: 'Detalle de vinculación de terceros' },
        loadComponent: () => import('./bussiness/vinculacion/vinculacion-detalle').then((m) => m.VinculacionDetalle),
      },
      {
        path: 'vinculacion-terceros/:id/editar',
        data: { titulo: 'Editar vinculación de terceros' },
        loadComponent: () => import('./bussiness/vinculacion/vinculacion-form').then((m) => m.VinculacionForm),
      },

      // Sistema
            {
        path: 'historial',
        data: { titulo: 'Historial de auditoría' },
        canActivate: [adminGuard],
        loadComponent: () => import('./bussiness/historial/historial').then((m) => m.Historial),
      },
    ],
  },

  { path: '**', redirectTo: 'dashboard' },
];
