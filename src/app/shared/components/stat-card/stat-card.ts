import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  templateUrl: './stat-card.html'
})
export class StatCard {
  @Input() titulo = '';
  @Input() valor: string | number = 0;
  @Input() descripcion = '';
  @Input() icono = '';
  @Input() color: 'blue' | 'pink' | 'green' | 'orange' = 'blue';
}
