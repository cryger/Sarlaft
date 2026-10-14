import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { mensajeApi } from '../../core/api.types';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  usuario = signal('');
  password = signal('');
  cargando = signal(false);
  error = signal('');
  /** Muestra u oculta la contraseña mientras se escribe. */
  mostrarClave = signal(false);

  constructor() {
    if (this.auth.autenticado()) {
      void this.router.navigateByUrl('/dashboard');
    }
  }

  entrar(): void {
    if (this.cargando()) {
      return;
    }
    if (!this.usuario().trim() || !this.password()) {
      this.error.set('Ingresa tu usuario y contraseña.');
      return;
    }

    this.cargando.set(true);
    this.error.set('');

    this.auth.login(this.usuario().trim(), this.password()).subscribe({
      next: () => {
        void this.router.navigateByUrl(this.destino());
      },
      error: (e) => {
        this.error.set(mensajeApi(e, 'No fue posible iniciar sesión.'));
        this.cargando.set(false);
      },
    });
  }

  /** Vuelve a la página que se intentó abrir, solo si es una ruta interna. */
  private destino(): string {
    const redirect = this.route.snapshot.queryParamMap.get('redirect') ?? '';
    return redirect.startsWith('/') && !redirect.startsWith('//') && !redirect.startsWith('/login')
      ? redirect
      : '/dashboard';
  }
}
