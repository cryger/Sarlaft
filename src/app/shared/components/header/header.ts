import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';

import { AuthService } from '../../../core/auth.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.html',
})
export class Header {
  @Output() menuToggle = new EventEmitter<void>();

  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  titulo = signal('Dashboard');

  constructor() {
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => {
        let ruta = this.router.routerState.snapshot.root;
        while (ruta.firstChild) ruta = ruta.firstChild;
        this.titulo.set(ruta.data['titulo'] ?? 'Dashboard');
      });
  }

  abrirMenu(): void {
    this.menuToggle.emit();
  }

  salir(): void {
    this.auth.logout();
  }
}
