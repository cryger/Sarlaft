import { Component, effect, input, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

import { CampoDef, SI_NO, mensajeCampo } from '../../../core/campo-def';
import { hoy } from '../../../core/formato';
import { Campo } from '../campo/campo';

const ANCHOS: Record<number, string> = {
  1: '',
  2: 'sm:col-span-2',
  3: 'sm:col-span-2 lg:col-span-3',
  4: 'sm:col-span-2 lg:col-span-4',
};

/**
 * Dibuja los campos de un grupo de formulario a partir de sus definiciones (CampoDef):
 * etiqueta, control, mensaje de error y los campos que solo aparecen según otras respuestas.
 *
 *   <app-campos-dinamicos [grupo]="natural" [campos]="grupo.campos" idBase="nat" [intento]="intento()" />
 */
@Component({
  selector: 'app-campos-dinamicos',
  imports: [ReactiveFormsModule, Campo],
  template: `
    <div [formGroup]="grupo()" class="grid grid-cols-1 gap-x-5 gap-y-1 sm:grid-cols-2 lg:grid-cols-4">
      @for (c of campos(); track c.nombre) {
        @if (visible(c)) {
          <div [class]="ancho(c)">
            @switch (c.tipo) {
              @case ('sino') {
                <fieldset class="mb-2">
                  <legend class="etiqueta">
                    {{ c.etiqueta }}
                    @if (c.requerido) {
                      <span class="text-red-500">*</span>
                    }
                  </legend>
                  <div class="flex gap-6 pt-1">
                    @for (o of sino; track o.valor) {
                      <label class="flex cursor-pointer items-center gap-2 text-sm text-blue-gray-700">
                        <input
                          type="radio"
                          [formControlName]="c.nombre"
                          [value]="o.valor"
                          [attr.value]="o.valor"
                          [attr.name]="idBase() + '-' + c.nombre"
                          [attr.data-campo]="c.nombre"
                          class="h-4 w-4 accent-blue-600"
                        />
                        {{ o.etiqueta }}
                      </label>
                    }
                  </div>
                  <p [id]="'err-' + id(c)" class="mt-1 min-h-4 text-xs text-red-600">{{ error(c) }}</p>
                </fieldset>
              }

              @case ('check') {
                <label class="mb-1 flex cursor-pointer items-start gap-2 text-sm text-blue-gray-700">
                  <input
                    type="checkbox"
                    [id]="id(c)"
                    [formControlName]="c.nombre"
                    class="mt-0.5 h-4 w-4 shrink-0 accent-blue-600"
                  />
                  <span>
                    {{ c.etiqueta }}
                    @if (c.requerido) {
                      <span class="text-red-500">*</span>
                    }
                  </span>
                </label>
                <p [id]="'err-' + id(c)" class="mb-1 min-h-4 text-xs text-red-600">{{ error(c) }}</p>
              }

              @default {
                <app-campo [etiqueta]="c.etiqueta" [para]="id(c)" [requerido]="!!c.requerido" [error]="error(c)" [ayuda]="c.ayuda ?? ''">
                  @switch (c.tipo) {
                    @case ('fecha') {
                      <input [id]="id(c)" type="date" class="campo" [formControlName]="c.nombre" [max]="c.noFutura ? hoy : null"
                             [attr.aria-invalid]="error(c) ? 'true' : null" [attr.aria-describedby]="'err-' + id(c)" />
                    }
                    @case ('numero') {
                      <input [id]="id(c)" type="number" inputmode="decimal" step="any" class="campo tabular-nums" [formControlName]="c.nombre"
                             [attr.aria-invalid]="error(c) ? 'true' : null" [attr.aria-describedby]="'err-' + id(c)" />
                    }
                    @case ('correo') {
                      <input [id]="id(c)" type="email" class="campo" [formControlName]="c.nombre" autocomplete="off"
                             [attr.aria-invalid]="error(c) ? 'true' : null" [attr.aria-describedby]="'err-' + id(c)" />
                    }
                    @case ('select') {
                      <select [id]="id(c)" class="campo" [formControlName]="c.nombre"
                              [attr.aria-invalid]="error(c) ? 'true' : null" [attr.aria-describedby]="'err-' + id(c)">
                        <option value="" disabled>Seleccione</option>
                        @for (o of c.opciones ?? []; track o) {
                          <option [value]="o">{{ o }}</option>
                        }
                      </select>
                    }
                    @case ('area') {
                      <textarea [id]="id(c)" rows="3" class="campo-area" [formControlName]="c.nombre"
                                [attr.aria-invalid]="error(c) ? 'true' : null" [attr.aria-describedby]="'err-' + id(c)"></textarea>
                    }
                    @default {
                      <input [id]="id(c)" type="text" class="campo" [formControlName]="c.nombre" autocomplete="off"
                             [attr.aria-invalid]="error(c) ? 'true' : null" [attr.aria-describedby]="'err-' + id(c)" />
                    }
                  }
                </app-campo>
              }
            }
          </div>
        }
      }
    </div>
  `,
})
export class CamposDinamicos {
  grupo = input.required<FormGroup>();
  campos = input.required<CampoDef[]>();
  /** Prefijo para que los id no se repitan cuando hay varios grupos o filas. */
  idBase = input('f');
  /** true cuando el usuario ya intentó enviar: se muestran todos los errores. */
  intento = input(false);

  readonly sino = SI_NO;
  readonly hoy = hoy();

  /** Valores actuales del grupo (para saber qué campos condicionales se muestran). */
  private readonly valores = signal<Record<string, any>>({});

  constructor() {
    effect((limpiar) => {
      const g = this.grupo();
      this.valores.set(g.getRawValue());
      const suscripcion = g.valueChanges.subscribe(() => this.valores.set(g.getRawValue()));
      limpiar(() => suscripcion.unsubscribe());
    });
  }

  visible(c: CampoDef): boolean {
    return !c.visibleSi || c.visibleSi(this.valores());
  }

  id(c: CampoDef): string {
    return `${this.idBase()}-${c.nombre}`;
  }

  ancho(c: CampoDef): string {
    return ANCHOS[c.ancho ?? 1];
  }

  error(c: CampoDef): string {
    return mensajeCampo(this.grupo().get(c.nombre), c, this.intento());
  }
}
