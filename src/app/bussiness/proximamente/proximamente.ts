import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-proximamente',
  imports: [RouterLink],
  templateUrl: './proximamente.html',
})
export class Proximamente {
  titulo: string = inject(ActivatedRoute).snapshot.data['titulo'] ?? 'Módulo';
}
