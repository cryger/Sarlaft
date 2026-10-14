import { computed, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl } from '@angular/forms';

import { normalizar } from './formato';
import { Declarante } from '../shared/services/declarantes';

/**
 * Lógica compartida para elegir un declarante con un buscador:
 * lista filtrada, declarante elegido y datos que le faltan.
 */
export function crearBuscadorDeclarantes(control: AbstractControl<number | null>) {
  const declarantes = signal<Declarante[]>([]);
  const busqueda = signal('');
  const actualizando = signal(false);
  const idElegido = toSignal(control.valueChanges, { initialValue: control.value });

  /** Declarantes que coinciden con la búsqueda (el elegido nunca desaparece de la lista). */
  const opciones = computed(() => {
    const t = normalizar(busqueda().trim());
    const elegido = idElegido();
    return declarantes().filter(
      (d) =>
        !t ||
        d.id_declarante === elegido ||
        normalizar(`${d.nombre} ${d.numero_documento}`).includes(t),
    );
  });

  const elegido = computed(() => {
    const id = idElegido();
    return declarantes().find((d) => d.id_declarante === id) ?? null;
  });

  return { declarantes, busqueda, actualizando, opciones, elegido };
}
