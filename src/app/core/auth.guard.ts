import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

/** Solo deja pasar a usuarios con sesión iniciada. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.autenticado()
    ? true
    : router.createUrlTree(['/login'], { queryParams: { redirect: state.url } });
};

/** Solo deja pasar a administradores. */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.esAdmin() ? true : router.createUrlTree(['/dashboard']);
};

/**
 * Lista de ROS: solo para administradores (es confidencial).
 * Los demás usuarios van al formulario de envío en lugar de al dashboard.
 */
export const rosListaGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.esAdmin() ? true : router.createUrlTree(['/reportes-ros/nuevo']);
};
