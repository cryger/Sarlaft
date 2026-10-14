import { Component, ElementRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';

import { mensajeApi } from '../../core/api.types';
import { AuthService } from '../../core/auth.service';
import { TIPOS_IDENTIFICACION } from '../../core/constantes';
import { formatoMoneda, hoy } from '../../core/formato';
import { Campo as CampoUI } from '../../shared/components/campo/campo';
import { DependenciasService } from '../../shared/services/dependencias';
import {
  DetalleMultiple,
  PeriodoAcumulado,
  TransaccionMultiple,
  TransaccionMultipleEntrada,
  TransaccionesMultiplesService,
  UMBRAL_MULTIPLES,
} from '../../shared/services/transacciones-multiples';

type CampoCabecera = 'area_responsable' | 'periodo_reporte' | 'fecha_elaboracion' | 'periodo_acumulado' | 'nombre_diligencia';
type CampoFila =
  | 'fecha'
  | 'nombre_pagador'
  | 'tipo_identificacion'
  | 'numero_identificacion'
  | 'numero_factura'
  | 'concepto'
  | 'valor';

const MAX_FILAS = 100;

function noVacio(control: AbstractControl): ValidationErrors | null {
  const v = control.value;
  return typeof v === 'string' && v.length > 0 && v.trim() === '' ? { required: true } : null;
}

function noFutura(control: AbstractControl): ValidationErrors | null {
  const v = control.value as string;
  return v && v > hoy() ? { futura: true } : null;
}

const claveTercero = (f: { tipo_identificacion?: string; numero_identificacion?: string }) =>
  `${(f.tipo_identificacion ?? '').trim().toUpperCase()}|${(f.numero_identificacion ?? '').trim().toUpperCase()}`;

/** Todas las filas deben ser del mismo tercero que la fila 1. */
function mismoTercero(control: AbstractControl): ValidationErrors | null {
  const fila = control.parent;
  const filas = fila?.parent as { at(i: number): AbstractControl } | null;
  if (!fila || !filas || filas.at(0) === fila) return null;
  return claveTercero(filas.at(0).value) !== claveTercero(fila.value) ? { tercero: true } : null;
}

/**
 * Formato E-PL-FO-16 "Transacciones múltiples" (v2.0): una fila por cada transacción en efectivo
 * de un mismo tercero. Los totales se calculan en pantalla y también en la API.
 */
@Component({
  selector: 'app-multiple-form',
  imports: [ReactiveFormsModule, RouterLink, CampoUI],
  templateUrl: './multiple-form.html',
})
export class MultipleForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly api = inject(TransaccionesMultiplesService);
  private readonly dependenciasApi = inject(DependenciasService);
  readonly auth = inject(AuthService);

  readonly tiposIdentificacion = TIPOS_IDENTIFICACION;
  readonly umbralTexto = formatoMoneda(UMBRAL_MULTIPLES);
  readonly maxFilas = MAX_FILAS;
  readonly hoy = hoy();

  /** null = registrar; número = editar */
  readonly id: number | null = Number(this.route.snapshot.paramMap.get('id')) || null;
  readonly editando = this.id !== null;

  areasApi = signal<string[]>([]);
  actual = signal<TransaccionMultiple | null>(null);
  cargando = signal(true);
  errorCarga = signal('');
  guardando = signal(false);
  error = signal('');
  intento = signal(false);

  private nuevaFila(d?: Partial<DetalleMultiple>) {
    return this.fb.group({
      fecha: this.fb.nonNullable.control(d?.fecha ?? hoy(), [Validators.required, noFutura]),
      nombre_pagador: this.fb.nonNullable.control(d?.nombre_pagador ?? '', [
        Validators.required,
        noVacio,
        Validators.maxLength(200),
      ]),
      tipo_identificacion: this.fb.nonNullable.control(d?.tipo_identificacion ?? '', [Validators.required]),
      numero_identificacion: this.fb.nonNullable.control(d?.numero_identificacion ?? '', [
        Validators.required,
        noVacio,
        Validators.maxLength(30),
        Validators.pattern(/^[A-Za-z0-9-]+$/),
        mismoTercero,
      ]),
      numero_factura: this.fb.nonNullable.control(d?.numero_factura ?? '', [
        Validators.required,
        noVacio,
        Validators.maxLength(50),
      ]),
      concepto: this.fb.nonNullable.control(d?.concepto ?? '', [Validators.required, noVacio]),
      valor: this.fb.control<number | null>(d?.valor ?? null, [
        Validators.required,
        Validators.min(0.01),
        Validators.max(9999999999999),
      ]),
      observaciones: this.fb.nonNullable.control(d?.observaciones ?? ''),
    });
  }

  readonly detalles = this.fb.array([this.nuevaFila()]);

  readonly form = this.fb.group({
    // Información general del reportante
    area_responsable: this.fb.nonNullable.control('', [Validators.required]),
    periodo_reporte: this.fb.nonNullable.control(hoy().slice(0, 7), [
      Validators.required,
      Validators.pattern(/^\d{4}-(0[1-9]|1[0-2])$/),
    ]),
    fecha_elaboracion: this.fb.nonNullable.control(hoy(), [Validators.required, noFutura]),
    // Datos de cierre
    periodo_acumulado: this.fb.nonNullable.control<PeriodoAcumulado>('Mes', [Validators.required]),
    nombre_diligencia: this.fb.nonNullable.control('', [Validators.required, noVacio, Validators.maxLength(200)]),
    // Transacciones
    detalles: this.detalles,
  });

  private readonly valoresFilas = toSignal(this.detalles.valueChanges, { initialValue: this.detalles.value });

  /** Totales en vivo (la API los vuelve a calcular al guardar). */
  total = computed(() =>
    this.valoresFilas().reduce((suma, f) => suma + (typeof f.valor === 'number' && f.valor > 0 ? f.valor : 0), 0),
  );
  cantidad = computed(() => this.valoresFilas().length);
  supera = computed(() => this.total() >= UMBRAL_MULTIPLES);
  hayValores = computed(() => this.total() > 0);
  totalTexto = computed(() => formatoMoneda(this.total()));

  areas = computed(() => {
    const guardada = this.actual()?.area_responsable;
    const lista = this.areasApi();
    return guardada && !lista.includes(guardada) ? [...lista, guardada] : lista;
  });

  /** Un gestor no puede editar un reporte que ya fue revisado. */
  bloqueada = computed(() => {
    const m = this.actual();
    return !!m && !this.auth.esAdmin() && m.estado !== 'Pendiente';
  });

  constructor() {
    // Si cambia el tercero de la fila 1, hay que volver a evaluar las demás filas
    this.detalles.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.detalles.controls.forEach((fila, i) => {
        if (i > 0) fila.controls.numero_identificacion.updateValueAndValidity({ emitEvent: false });
      });
    });

    // Quien diligencia suele ser el usuario con sesión iniciada
    const usuario = this.auth.usuario();
    if (usuario?.nombre) {
      this.form.controls.nombre_diligencia.setValue(usuario.nombre);
    }
  }

  ngOnInit(): void {
    forkJoin({
      dependencias: this.dependenciasApi.listar(),
      multiple: this.id !== null ? this.api.obtener(this.id) : of(null),
    }).subscribe({
      next: ({ dependencias, multiple }) => {
        this.areasApi.set(dependencias.data.map((d) => d.nombre));
        if (multiple) {
          this.actual.set(multiple.data);
          this.rellenar(multiple.data);
        }
        this.cargando.set(false);
      },
      error: (e) => {
        this.errorCarga.set(mensajeApi(e, 'No fue posible cargar el formulario.'));
        this.cargando.set(false);
      },
    });
  }

  private rellenar(m: TransaccionMultiple): void {
    this.form.patchValue({
      area_responsable: m.area_responsable ?? '',
      periodo_reporte: m.periodo_reporte ?? hoy().slice(0, 7),
      fecha_elaboracion: m.fecha_elaboracion ?? hoy(),
      periodo_acumulado: (m.periodo_acumulado as PeriodoAcumulado) ?? 'Mes',
      nombre_diligencia: m.nombre_diligencia ?? '',
    });

    this.detalles.clear();
    for (const d of m.detalles ?? []) {
      this.detalles.push(this.nuevaFila(d));
    }
    if (this.detalles.length === 0) {
      this.detalles.push(this.nuevaFila());
    }
  }

  // --------------------------------------------------------------- filas

  /** Agrega una fila nueva con el mismo tercero que la primera (es lo habitual en este formato). */
  agregarFila(): void {
    if (this.detalles.length >= MAX_FILAS) return;
    const primera = this.detalles.at(0).getRawValue();
    this.detalles.push(
      this.nuevaFila({
        nombre_pagador: primera.nombre_pagador,
        tipo_identificacion: primera.tipo_identificacion,
        numero_identificacion: primera.numero_identificacion,
      }),
    );
  }

  quitarFila(i: number): void {
    if (this.detalles.length > 1) {
      this.detalles.removeAt(i);
    }
  }

  // ------------------------------------------------------------ mensajes

  mensaje(campo: CampoCabecera): string {
    const c = this.form.controls[campo];
    if (!c.invalid || !(c.touched || this.intento())) {
      return '';
    }

    const e = c.errors ?? {};
    if (e['servidor']) return e['servidor'] as string;
    if (e['required']) return 'Este campo es obligatorio.';
    if (e['futura']) return 'La fecha no puede ser posterior a hoy.';
    if (e['pattern']) return 'Selecciona un mes válido.';
    if (e['maxlength']) return `Máximo ${e['maxlength'].requiredLength} caracteres.`;
    return 'Valor no válido.';
  }

  mensajeFila(i: number, campo: CampoFila): string {
    const c = this.detalles.at(i).controls[campo];
    if (!c.invalid || !(c.touched || this.intento())) {
      return '';
    }

    const e = c.errors ?? {};
    if (e['servidor']) return e['servidor'] as string;
    if (e['tercero']) return 'Debe ser el mismo tercero de la fila 1.';
    if (e['required']) return 'Obligatorio.';
    if (e['futura']) return 'No puede ser futura.';
    if (e['min']) return 'Debe ser mayor que cero.';
    if (e['max']) return 'Valor demasiado grande.';
    if (e['pattern']) return 'Solo letras, números y guion.';
    if (e['maxlength']) return `Máximo ${e['maxlength'].requiredLength}.`;
    return 'Valor no válido.';
  }

  /** Error general de la lista de transacciones que devuelve la API. */
  mensajeLista(): string {
    return (this.detalles.errors?.['servidor'] as string | undefined) ?? '';
  }

  // ------------------------------------------------------------- guardar

  guardar(): void {
    if (this.guardando()) {
      return;
    }

    this.intento.set(true);
    this.error.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.host.nativeElement.querySelector<HTMLElement>('[formControlName].ng-invalid')?.focus();
      return;
    }

    const v = this.form.getRawValue();
    const datos: TransaccionMultipleEntrada = {
      area_responsable: v.area_responsable,
      periodo_reporte: v.periodo_reporte,
      fecha_elaboracion: v.fecha_elaboracion,
      periodo_acumulado: v.periodo_acumulado,
      nombre_diligencia: v.nombre_diligencia.trim(),
      detalles: v.detalles.map((f) => ({
        fecha: f.fecha,
        nombre_pagador: f.nombre_pagador.trim(),
        tipo_identificacion: f.tipo_identificacion,
        numero_identificacion: f.numero_identificacion.trim(),
        numero_factura: f.numero_factura.trim(),
        concepto: f.concepto.trim(),
        valor: f.valor as number,
        observaciones: f.observaciones.trim() || null,
      })),
    };

    this.guardando.set(true);
    const peticion = this.id !== null ? this.api.actualizar(this.id, datos) : this.api.crear(datos);

    peticion.subscribe({
      next: (r) => {
        const mensaje = this.editando
          ? `Los cambios de ${r.data.consecutivo} se guardaron correctamente.`
          : `El reporte ${r.data.consecutivo} se registró correctamente.`;
        void this.router.navigate(['/transacciones-multiples', r.data.id_multiple], { state: { mensaje } });
      },
      error: (e) => {
        // La API señala la fila y el campo: "detalles.2.valor"
        const errores = (e?.error?.errors ?? {}) as Record<string, string>;
        let enCampos = false;
        for (const [campo, texto] of Object.entries(errores)) {
          const control = this.form.get(campo);
          if (control) {
            control.setErrors({ servidor: texto });
            control.markAsTouched();
            enCampos = true;
          }
        }

        this.error.set(
          enCampos ? 'Revisa los campos marcados en rojo.' : mensajeApi(e, 'No fue posible guardar el reporte.'),
        );
        this.guardando.set(false);
      },
    });
  }
}
