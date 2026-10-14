import { Component, input } from '@angular/core';

/**
 * Envoltorio de un campo de formulario: etiqueta, marca de obligatorio y mensaje de error.
 * El control (input, select, textarea) se escribe adentro y lleva la clase "campo" o "campo-area":
 *
 *   <app-campo etiqueta="Barrio" para="barrio" [requerido]="true" [error]="mensaje('barrio')">
 *     <input id="barrio" class="campo" formControlName="barrio"
 *            [attr.aria-invalid]="mensaje('barrio') ? 'true' : null" aria-describedby="err-barrio" />
 *   </app-campo>
 */
@Component({
  selector: 'app-campo',
  host: { class: 'block' },
  template: `
    <label [attr.for]="para()" class="etiqueta">
      {{ etiqueta() }}
      @if (requerido()) {
        <span class="text-red-500">*</span>
      }
      @if (nota()) {
        <span class="font-normal text-blue-gray-400">({{ nota() }})</span>
      }
    </label>

    <ng-content />

    <p
      [id]="'err-' + para()"
      class="mt-1 min-h-4 text-xs"
      [class]="error() ? 'text-red-600' : 'text-blue-gray-500'"
    >
      {{ error() || ayuda() }}
    </p>
  `,
})
export class Campo {
  /** Texto de la etiqueta. */
  etiqueta = input.required<string>();
  /** id del control (une la etiqueta y el mensaje de error con el campo). */
  para = input.required<string>();
  requerido = input(false);
  /** Aclaración junto a la etiqueta, por ejemplo "si aplica". */
  nota = input('');
  error = input('');
  /** Texto de ayuda que se muestra cuando no hay error. */
  ayuda = input('');
}
