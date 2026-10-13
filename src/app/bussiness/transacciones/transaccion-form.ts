import { Component, ElementRef, OnInit, computed, effect, inject, signal } from '@angular/core';
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
import { TEXTO_AUTORIZACION_DATOS } from '../../core/autorizacion';
import { AuthService } from '../../core/auth.service';
import { formatoMoneda, hoy, normalizar } from '../../core/formato';
import { Declarante, DeclarantesService } from '../../shared/services/declarantes';
import { DependenciasService } from '../../shared/services/dependencias';
import {
  TipoOperacion,
  Transaccion,
  TransaccionEntrada,
  TransaccionesService,
  UMBRAL_EFECTIVO,
} from '../../shared/services/transacciones';

type Campo =
  | 'area_responsable'
  | 'periodo_reporte'
  | 'fecha_elaboracion'
  | 'fecha_operacion'
  | 'tipo_operacion'
  | 'tipo_operacion_otro'
  | 'valor'
  | 'numero_factura'
  | 'concepto_pago'
  | 'id_declarante'
  | 'barrio'
  | 'actividad_economica'
  | 'relacion_paciente'
  | 'origen_fondos'
  | 'autoriza'
  | 'titular_nombre'
  | 'titular_documento';

/** Rechaza textos que solo tienen espacios. */
function noVacio(control: AbstractControl): ValidationErrors | null {
  const v = control.value;
  return typeof v === 'string' && v.length > 0 && v.trim() === '' ? { required: true } : null;
}

/** Las fechas no pueden ser posteriores a hoy. */
function noFutura(control: AbstractControl): ValidationErrors | null {
  const v = control.value as string;
  return v && v > hoy() ? { futura: true } : null;
}

/** "¿Cuál?" es obligatorio cuando el tipo de operación es "Otro". */
function cualObligatorio(control: AbstractControl): ValidationErrors | null {
  const esOtro = control.parent?.get('tipo_operacion')?.value === 'Otro';
  return esOtro && !String(control.value ?? '').trim() ? { required: true } : null;
}

/**
 * Formato E-PL-FO-15 "Transacción individual en efectivo" (v2.0).
 * Crea (/transacciones/nuevo) y edita (/transacciones/:id/editar).
 */
@Component({
  selector: 'app-transaccion-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './transaccion-form.html',
})
export class TransaccionForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly api = inject(TransaccionesService);
  private readonly declarantesApi = inject(DeclarantesService);
  private readonly dependenciasApi = inject(DependenciasService);
  readonly auth = inject(AuthService);

  readonly tiposOperacion: TipoOperacion[] = ['Pago', 'Abono', 'Devolución', 'Otro'];
  readonly textoAutorizacion = TEXTO_AUTORIZACION_DATOS;
  readonly umbral = UMBRAL_EFECTIVO;
  readonly umbralTexto = formatoMoneda(UMBRAL_EFECTIVO);
  readonly hoy = hoy();

  /** null = registrar; número = editar */
  readonly id: number | null = Number(this.route.snapshot.paramMap.get('id')) || null;
  readonly editando = this.id !== null;

  declarantes = signal<Declarante[]>([]);
  areasApi = signal<string[]>([]);
  actual = signal<Transaccion | null>(null); // la transacción que se edita
  cargando = signal(true);
  errorCarga = signal('');
  guardando = signal(false);
  error = signal('');
  intento = signal(false);
  busqueda = signal('');
  actualizandoLista = signal(false);

  readonly form = this.fb.group({
    // Información general
    area_responsable: this.fb.nonNullable.control('', [Validators.required]),
    periodo_reporte: this.fb.nonNullable.control(hoy().slice(0, 7), [
      Validators.required,
      Validators.pattern(/^\d{4}-(0[1-9]|1[0-2])$/),
    ]),
    fecha_elaboracion: this.fb.nonNullable.control(hoy(), [Validators.required, noFutura]),

    // Datos de la operación
    fecha_operacion: this.fb.nonNullable.control(hoy(), [Validators.required, noFutura]),
    tipo_operacion: this.fb.control<TipoOperacion | null>(null, [Validators.required]),
    tipo_operacion_otro: this.fb.nonNullable.control('', [cualObligatorio, Validators.maxLength(150)]),
    valor: this.fb.control<number | null>(null, [
      Validators.required,
      (c) => this.validarMinimo(c),
      Validators.max(9999999999999),
    ]),
    numero_factura: this.fb.nonNullable.control('', [Validators.required, noVacio, Validators.maxLength(50)]),
    concepto_pago: this.fb.nonNullable.control('', [Validators.required, noVacio]),

    // Datos de quien realiza el pago
    id_declarante: this.fb.control<number | null>(null, [Validators.required]),
    barrio: this.fb.nonNullable.control('', [Validators.required, noVacio, Validators.maxLength(100)]),
    actividad_economica: this.fb.nonNullable.control('', [Validators.required, noVacio, Validators.maxLength(250)]),
    relacion_paciente: this.fb.nonNullable.control('', [Validators.required, noVacio, Validators.maxLength(150)]),
    origen_fondos: this.fb.nonNullable.control('', [Validators.required, noVacio]),
    senales_alerta: this.fb.nonNullable.control(''),

    // Autorización de datos personales
    autoriza: this.fb.nonNullable.control(false, [Validators.requiredTrue]),
    titular_nombre: this.fb.nonNullable.control('', [Validators.required, noVacio, Validators.maxLength(200)]),
    titular_documento: this.fb.nonNullable.control('', [Validators.required, noVacio, Validators.maxLength(100)]),
  });

  private readonly idSeleccionado = toSignal(this.form.controls.id_declarante.valueChanges, {
    initialValue: null,
  });
  private readonly valorEscrito = toSignal(this.form.controls.valor.valueChanges, { initialValue: null });
  private readonly tipoElegido = toSignal(this.form.controls.tipo_operacion.valueChanges, { initialValue: null });

  esOtro = computed(() => this.tipoElegido() === 'Otro');

  valorFormateado = computed(() => {
    const v = this.valorEscrito();
    return typeof v === 'number' && v > 0 ? formatoMoneda(v) : '';
  });

  /** Dependencias (más el área guardada si ya no figura en la lista). */
  areas = computed(() => {
    const guardada = this.actual()?.area_responsable;
    const lista = this.areasApi();
    return guardada && !lista.includes(guardada) ? [...lista, guardada] : lista;
  });

  /** Declarantes que coinciden con la búsqueda (el seleccionado nunca desaparece de la lista). */
  opciones = computed(() => {
    const t = normalizar(this.busqueda().trim());
    const elegido = this.idSeleccionado();
    return this.declarantes().filter(
      (d) =>
        !t ||
        d.id_declarante === elegido ||
        normalizar(`${d.nombre} ${d.numero_documento}`).includes(t),
    );
  });

  declaranteElegido = computed(() => {
    const id = this.idSeleccionado();
    return this.declarantes().find((d) => d.id_declarante === id) ?? null;
  });

  /** Datos del formato que el declarante todavía no tiene registrados. */
  faltantes = computed(() => {
    const d = this.declaranteElegido();
    if (!d) return [];
    const lista: string[] = [];
    if (!d.telefono) lista.push('teléfono');
    if (!d.correo) lista.push('correo electrónico');
    if (!d.direccion) lista.push('dirección');
    return lista;
  });

  /** Un gestor no puede editar una transacción que ya fue revisada. */
  bloqueada = computed(() => {
    const t = this.actual();
    return !!t && !this.auth.esAdmin() && t.estado !== 'Pendiente';
  });

  private autoNombre = '';
  private autoDocumento = '';

  constructor() {
    // Si cambia el tipo de operación hay que volver a evaluar el "¿Cuál?"
    this.form.controls.tipo_operacion.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.form.controls.tipo_operacion_otro.updateValueAndValidity());

    // El titular de la autorización suele ser quien paga: se sugiere su nombre y documento
    effect(() => {
      const d = this.declaranteElegido();
      if (!d) return;

      const nombre = this.form.controls.titular_nombre;
      const documento = this.form.controls.titular_documento;
      const docTexto = `${d.tipo_documento} ${d.numero_documento}`;

      if (!nombre.value || nombre.value === this.autoNombre) {
        nombre.setValue(d.nombre);
        this.autoNombre = d.nombre;
      }
      if (!documento.value || documento.value === this.autoDocumento) {
        documento.setValue(docTexto);
        this.autoDocumento = docTexto;
      }
    });
  }

  /** El mínimo solo se exige al registrar o cuando se cambia el valor de un registro antiguo. */
  private validarMinimo(control: AbstractControl): ValidationErrors | null {
    const v = control.value as number | null;
    if (v === null || v === undefined || v >= UMBRAL_EFECTIVO) return null;
    const original = this.actual()?.valor;
    return original !== undefined && v === original ? null : { min: true };
  }

  ngOnInit(): void {
    forkJoin({
      declarantes: this.declarantesApi.listar({ limit: 1000 }),
      dependencias: this.dependenciasApi.listar(),
      transaccion: this.id !== null ? this.api.obtener(this.id) : of(null),
    }).subscribe({
      next: ({ declarantes, dependencias, transaccion }) => {
        this.declarantes.set(declarantes.data);
        this.areasApi.set(dependencias.data.map((d) => d.nombre));
        if (transaccion) {
          this.actual.set(transaccion.data);
          this.rellenar(transaccion.data);
        }
        this.cargando.set(false);
      },
      error: (e) => {
        this.errorCarga.set(mensajeApi(e, 'No fue posible cargar el formulario.'));
        this.cargando.set(false);
      },
    });
  }

  /** Vuelve a pedir los declarantes (por ejemplo después de registrar uno nuevo en otra pestaña). */
  actualizarDeclarantes(): void {
    this.actualizandoLista.set(true);
    this.declarantesApi.listar({ limit: 1000 }).subscribe({
      next: (r) => {
        this.declarantes.set(r.data);
        this.actualizandoLista.set(false);
      },
      error: () => this.actualizandoLista.set(false),
    });
  }

  private rellenar(t: Transaccion): void {
    this.form.patchValue({
      area_responsable: t.area_responsable ?? '',
      periodo_reporte: t.periodo_reporte ?? hoy().slice(0, 7),
      fecha_elaboracion: t.fecha_elaboracion ?? hoy(),
      fecha_operacion: t.fecha_operacion,
      tipo_operacion: t.tipo_operacion,
      tipo_operacion_otro: t.tipo_operacion_otro ?? '',
      valor: t.valor,
      numero_factura: t.numero_factura ?? '',
      concepto_pago: t.concepto_pago ?? '',
      id_declarante: t.id_declarante,
      barrio: t.barrio ?? '',
      actividad_economica: t.actividad_economica ?? '',
      relacion_paciente: t.relacion_paciente ?? '',
      origen_fondos: t.origen_fondos ?? '',
      senales_alerta: t.senales_alerta ?? '',
      autoriza: t.autoriza_datos === 'SI',
      titular_nombre: t.titular_nombre ?? '',
      titular_documento: t.titular_documento ?? '',
    });
  }

  mensaje(campo: Campo): string {
    const c = this.form.controls[campo];
    if (!c.invalid || !(c.touched || this.intento())) {
      return '';
    }

    const e = c.errors ?? {};
    if (e['servidor']) return e['servidor'] as string;
    if (e['required']) {
      if (campo === 'id_declarante') return 'Selecciona quién realiza el pago.';
      if (campo === 'autoriza') return 'Debes aceptar la autorización de datos personales para continuar.';
      if (campo === 'tipo_operacion') return 'Selecciona el tipo de operación.';
      if (campo === 'tipo_operacion_otro') return 'Indica cuál es el tipo de operación.';
      return 'Este campo es obligatorio.';
    }
    if (e['futura']) return 'La fecha no puede ser posterior a hoy.';
    if (e['min']) return `Este formato aplica para transacciones iguales o superiores a ${this.umbralTexto}.`;
    if (e['max']) return 'El valor es demasiado grande.';
    if (e['pattern']) return 'Selecciona un mes válido.';
    if (e['maxlength']) return `Máximo ${e['maxlength'].requiredLength} caracteres.`;
    return 'Valor no válido.';
  }

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
    const datos: TransaccionEntrada = {
      area_responsable: v.area_responsable,
      periodo_reporte: v.periodo_reporte,
      fecha_elaboracion: v.fecha_elaboracion,
      fecha_operacion: v.fecha_operacion,
      tipo_operacion: v.tipo_operacion as TipoOperacion,
      tipo_operacion_otro: v.tipo_operacion === 'Otro' ? v.tipo_operacion_otro.trim() : null,
      valor: v.valor as number,
      numero_factura: v.numero_factura.trim(),
      concepto_pago: v.concepto_pago.trim(),
      id_declarante: v.id_declarante as number,
      barrio: v.barrio.trim(),
      actividad_economica: v.actividad_economica.trim(),
      relacion_paciente: v.relacion_paciente.trim(),
      origen_fondos: v.origen_fondos.trim(),
      senales_alerta: v.senales_alerta.trim() || null,
      titular_nombre: v.titular_nombre.trim(),
      titular_documento: v.titular_documento.trim(),
      autoriza_datos: v.autoriza ? 'SI' : 'NO',
    };

    this.guardando.set(true);
    const peticion =
      this.id !== null ? this.api.actualizar(this.id, datos) : this.api.crear(datos);

    peticion.subscribe({
      next: (r) => {
        const mensaje = this.editando
          ? `Los cambios de ${r.data.consecutivo} se guardaron correctamente.`
          : `La transacción ${r.data.consecutivo} se registró correctamente.`;
        void this.router.navigate(['/transacciones', r.data.id_transaccion], { state: { mensaje } });
      },
      error: (e) => {
        // La API devuelve errores por campo: se muestran junto a cada campo
        const errores = (e?.error?.errors ?? {}) as Record<string, string>;
        let enCampos = false;
        for (const [campo, texto] of Object.entries(errores)) {
          const control = this.form.get(campo === 'autoriza_datos' ? 'autoriza' : campo);
          if (control) {
            control.setErrors({ servidor: texto });
            control.markAsTouched();
            enCampos = true;
          }
        }

        this.error.set(
          enCampos
            ? 'Revisa los campos marcados en rojo.'
            : mensajeApi(e, 'No fue posible guardar la transacción.'),
        );
        this.guardando.set(false);
      },
    });
  }
}
