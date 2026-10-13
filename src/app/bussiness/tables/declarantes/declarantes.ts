import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { mensajeApi } from '../../../core/api.types';
import { AuthService } from '../../../core/auth.service';
import {
  DeclarantesService,
  Declarante,
} from '../../../shared/services/declarantes';

@Component({
  selector: 'app-declarantes',
  imports: [FormsModule, RouterLink],
  templateUrl: './declarantes.html',
  styleUrl: './declarantes.css',
})
export class DeclarantesComponent implements OnInit {
  private declarantesService = inject(DeclarantesService);
  readonly auth = inject(AuthService);

  // Angular 22 no usa zone.js: los cambios que llegan desde una respuesta HTTP
  // hay que avisarlos con markForCheck() para que la pantalla se actualice.
  private cdr = inject(ChangeDetectorRef);

  declarantes: Declarante[] = [];
  declarantesFiltrados: Declarante[] = [];

  cargando = false;
  terminoBusqueda = '';
  error = '';

  ngOnInit(): void {
    this.cargarDeclarantes();
  }

  cargarDeclarantes(): void {
    this.cargando = true;
    this.error = '';

    this.declarantesService.listar().subscribe({
      next: (respuesta) => {
        if (respuesta.success) {
          this.declarantes = respuesta.data ?? [];
          this.buscar();
        } else {
          this.declarantes = [];
          this.declarantesFiltrados = [];
          this.error =
            respuesta.message ?? 'No fue posible cargar los declarantes.';
        }

        this.cargando = false;
        this.cdr.markForCheck();
      },

      error: (error) => {
        console.error('Error cargando declarantes:', error);

        this.error = mensajeApi(error, 'No fue posible cargar los declarantes.');
        this.cargando = false;
        this.cdr.markForCheck();
      },
    });
  }

  buscar(): void {
    const termino = this.terminoBusqueda.trim().toLowerCase();

    if (!termino) {
      this.declarantesFiltrados = [...this.declarantes];
      return;
    }

    const contiene = (valor?: string | null) =>
      (valor ?? '').toLowerCase().includes(termino);

    this.declarantesFiltrados = this.declarantes.filter(
      (d) =>
        contiene(d.nombre) ||
        contiene(d.numero_documento) ||
        contiene(d.cargo) ||
        contiene(d.dependencia) ||
        contiene(d.correo),
    );
  }

  limpiarBusqueda(): void {
    this.terminoBusqueda = '';
    this.declarantesFiltrados = [...this.declarantes];
  }

  eliminar(id: number): void {
    const confirmar = window.confirm('¿Está seguro de eliminar este declarante?');

    if (!confirmar) {
      return;
    }

    this.declarantesService.eliminar(id).subscribe({
      next: (respuesta) => {
        if (respuesta.success) {
          this.cargarDeclarantes();
        } else {
          this.error =
            respuesta.message ?? 'No fue posible eliminar el declarante.';
          this.cdr.markForCheck();
        }
      },

      error: (error) => {
        console.error(error);

        this.error = mensajeApi(error, 'Ocurrió un error al eliminar el declarante.');
        this.cdr.markForCheck();
      },
    });
  }
}
