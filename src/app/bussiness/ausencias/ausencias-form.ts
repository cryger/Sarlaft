import { Component, ElementRef, OnInit, computed, effect, inject, signal } from '@angular/core';
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
import { crearBuscadorDeclarantes } from '../../core/buscador-declarantes';
import { ENTIDAD } from '../../core/constantes';
import { hoy } from '../../core/formato';
import { Campo as CampoUI } from '../../shared/components/campo/campo';
import { DeclarantesService } from '../../shared/services/declarantes';
import { DependenciasService } from '../../shared/services/dependencias';
import { Ausencia, AusenciaEntrada, AusenciasService, SiNo } from '../../shared/services/ausencias';

type Campo =
  | 'entidad'
  | 'area_proceso'
  | 'id_declarante'
  | 'periodo_desde'
  | 'periodo_hasta'
  | 'fecha_elaboracion'
  | 'declaracion'
  | 'manejo_caja'
  | 'recibio_efectivo'
  | 'intento_pago';

const TEXTO_DECLARACION =
  'Yo, el responsable del área antes identificada, certifico que durante el periodo reportado NO se ' +
  'realizaron transacciones individuales ni múltiples en efectivo, ni operaciones intentadas o inusuales ' +
  'relacionadas con manejo de dinero en efectivo que deban ser reportadas conforme a las políticas ' +
  'institucionales, el SARLAFT y demás disposiciones aplicables.';

function noVacio(control: AbstractControl): ValidationErrors | null {
  const v = control.value;
  return typeof v === 'string' && v.length > 0 && v.trim() === '' ? { required: true } : null;
}

function noFutura(control: AbstractControl): ValidationErrors | null {
  const v = control.value as string;
  return v && v > hoy() ? { futura: true } : null;
}

/** "Hasta" no puede ser anterior a "Desde". */
function rangoValido(grupo: AbstractControl): ValidationErrors | null {
  const desde = grupo.get('periodo_desde')?.value as string;
  const hasta = grupo.get('periodo_hasta')?.value as string;
  return desde && hasta && hasta < desde ? { rango: true } : null;
}

/** Formato E-PL-FO-13 "Ausencia de transacciones en efectivo" (v1.0). */
@Component({
  selector: 'app-ausencia-form',
  imports: [ReactiveFormsModule, RouterLink, CampoUI],
  templateUrl: './ausencias-form.html',
})
export class AusenciaForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly api = inject(AusenciasService);
  private readonly declarantesApi = inject(DeclarantesService);
  private readonly dependenciasApi = inject(DependenciasService);
  readonly auth = inject(AuthService);

  readonly textoDeclaracion = TEXTO_DECLARACION;
  readonly hoy = hoy();
  readonly opcionesSiNo: { valor: SiNo; etiqueta: string }[] = [
    { valor: 'SI', etiqueta: 'Sí' },
    { valor: 'NO', etiqueta: 'No' },
  ];
  readonly preguntas = [
    { campo: 'manejo_caja' as const, texto: '¿El área maneja caja menor o recaudo en efectivo?' },
    { campo: 'recibio_efectivo' as const, texto: '¿Se recibieron pagos en efectivo?' },
    { campo: 'intento_pago' as const, texto: '¿Se presentaron intentos de pago en efectivo rechazados?' },
  ];

  /** null = registrar; número = editar */
  readonly id: number | null = Number(this.route.snapshot.paramMap.get('id')) || null;
  readonly editando = this.id !== null;

  areasApi = signal<string[]>([]);
  actual = signal<Ausencia | null>(null);
  cargando = signal(true);
  errorCarga = signal('');
  guardando = signal(false);
  error = signal('');
  intento = signal(false);

  readonly form = this.fb.group(
    {
      // Datos generales
      entidad: this.fb.nonNullable.control(ENTIDAD, [Validators.required, noVacio, Validators.maxLength(200)]),
      area_proceso: this.fb.nonNullable.control('', [Validators.required]),
      id_declarante: this.fb.control<number | null>(null, [Validators.required]),
      // Periodo reportado
      periodo_desde: this.fb.nonNullable.control(hoy().slice(0, 8) + '01', [Validators.required]),
      periodo_hasta: this.fb.nonNullable.control(hoy(), [Validators.required, noFutura]),
      fecha_elaboracion: this.fb.nonNullable.control(hoy(), [Validators.required, noFutura]),
      // Declaración y verificación
      declaracion: this.fb.nonNullable.control(false, [Validators.requiredTrue]),
      manejo_caja: this.fb.control<SiNo | null>(null, [Validators.required]),
      recibio_efectivo: this.fb.control<SiNo | null>(null, [Validators.required]),
      intento_pago: this.fb.control<SiNo | null>(null, [Validators.required]),
      observaciones: this.fb.nonNullable.control(''),
    },
    { validators: rangoValido },
  );

  readonly buscador = crearBuscadorDeclarantes(this.form.controls.id_declarante);

  areas = computed(() => {
    const guardada = this.actual()?.area_proceso;
    const lista = this.areasApi();
    return guardada && !lista.includes(guardada) ? [...lista, guardada] : lista;
  });

  /** Un gestor no puede editar un reporte que ya fue revisado. */
  bloqueada = computed(() => {
    const a = this.actual();
    return !!a && !this.auth.esAdmin() && a.estado !== 'Pendiente';
  });

  constructor() {
    // Al elegir al responsable se sugiere su dependencia como área del proceso
    effect(() => {
      const d = this.buscador.elegido();
      const area = this.form.controls.area_proceso;
      if (d?.dependencia && !area.value) {
        area.setValue(d.dependencia);
      }
    });
  }

  ngOnInit(): void {
    forkJoin({
      declarantes: this.declarantesApi.listar({ limit: 1000 }),
      dependencias: this.dependenciasApi.listar(),
      ausencia: this.id !== null ? this.api.obtener(this.id) : of(null),
    }).subscribe({
      next: ({ declarantes, dependencias, ausencia }) => {
        this.buscador.declarantes.set(declarantes.data);
        this.areasApi.set(dependencias.data.map((d) => d.nombre));
        if (ausencia) {
          this.actual.set(ausencia.data);
          this.rellenar(ausencia.data);
        }
        this.cargando.set(false);
      },
      error: (e) => {
        this.errorCarga.set(mensajeApi(e, 'No fue posible cargar el formulario.'));
        this.cargando.set(false);
      },
    });
  }

  actualizarDeclarantes(): void {
    this.buscador.actualizando.set(true);
    this.declarantesApi.listar({ limit: 1000 }).subscribe({
      next: (r) => {
        this.buscador.declarantes.set(r.data);
        this.buscador.actualizando.set(false);
      },
      error: () => this.buscador.actualizando.set(false),
    });
  }

  private rellenar(a: Ausencia): void {
    this.form.patchValue({
      entidad: a.entidad ?? ENTIDAD,
      area_proceso: a.area_proceso ?? '',
      id_declarante: a.id_declarante,
      periodo_desde: a.periodo_desde,
      periodo_hasta: a.periodo_hasta,
      fecha_elaboracion: a.fecha_elaboracion ?? hoy(),
      declaracion: a.declaracion === 'SI',
      manejo_caja: a.manejo_caja,
      recibio_efectivo: a.recibio_efectivo,
      intento_pago: a.intento_pago,
      observaciones: a.observaciones ?? '',
    });
  }

  mensaje(campo: Campo): string {
    const c = this.form.controls[campo];

    // "Hasta" también muestra el error de rango, que vive en el grupo
    if (campo === 'periodo_hasta' && this.form.hasError('rango') && (c.touched || this.intento())) {
      return 'Debe ser igual o posterior a la fecha inicial.';
    }

    if (!c.invalid || !(c.touched || this.intento())) {
      return '';
    }

    const e = c.errors ?? {};
    if (e['servidor']) return e['servidor'] as string;
    if (e['required']) {
      if (campo === 'id_declarante') return 'Selecciona al responsable del proceso.';
      if (campo === 'declaracion') return 'Debes certificar la declaración para enviar el formato.';
      if (['manejo_caja', 'recibio_efectivo', 'intento_pago'].includes(campo)) return 'Selecciona Sí o No.';
      return 'Este campo es obligatorio.';
    }
    if (e['futura']) return 'La fecha no puede ser posterior a hoy.';
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
    const datos: AusenciaEntrada = {
      entidad: v.entidad.trim(),
      area_proceso: v.area_proceso,
      id_declarante: v.id_declarante as number,
      periodo_desde: v.periodo_desde,
      periodo_hasta: v.periodo_hasta,
      fecha_elaboracion: v.fecha_elaboracion,
      declaracion: v.declaracion ? 'SI' : 'NO',
      manejo_caja: v.manejo_caja as SiNo,
      recibio_efectivo: v.recibio_efectivo as SiNo,
      intento_pago: v.intento_pago as SiNo,
      observaciones: v.observaciones.trim() || null,
    };

    this.guardando.set(true);
    const peticion = this.id !== null ? this.api.actualizar(this.id, datos) : this.api.crear(datos);

    peticion.subscribe({
      next: (r) => {
        const mensaje = this.editando
          ? `Los cambios de ${r.data.consecutivo} se guardaron correctamente.`
          : `El formato ${r.data.consecutivo} se registró correctamente.`;
        void this.router.navigate(['/ausencias', r.data.id_ausencia], { state: { mensaje } });
      },
      error: (e) => {
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
          enCampos ? 'Revisa los campos marcados en rojo.' : mensajeApi(e, 'No fue posible guardar el formato.'),
        );
        this.guardando.set(false);
      },
    });
  }
}
