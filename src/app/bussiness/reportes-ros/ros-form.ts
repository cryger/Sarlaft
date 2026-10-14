import { Component, ElementRef, OnInit, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { crearBuscadorDeclarantes } from '../../core/buscador-declarantes';
import { TIPOS_IDENTIFICACION } from '../../core/constantes';
import { hoy } from '../../core/formato';
import { Campo as CampoUI } from '../../shared/components/campo/campo';
import { DeclarantesService } from '../../shared/services/declarantes';
import { DependenciasService } from '../../shared/services/dependencias';
import {
  ReporteRos,
  ReporteRosEntrada,
  ReportesRosService,
  TipoOperacionRos,
  TipoTercero,
} from '../../shared/services/reportes-ros';

type Campo =
  | 'id_declarante'
  | 'fecha_reporte'
  | 'tipo_operacion'
  | 'area_involucrada'
  | 'nombre_tercero'
  | 'tipo_tercero'
  | 'tipo_identificacion'
  | 'numero_identificacion'
  | 'descripcion'
  | 'valor_economico'
  | 'indicios'
  | 'autoriza'
  | 'titular_nombre'
  | 'titular_documento';

function noVacio(control: AbstractControl): ValidationErrors | null {
  const v = control.value;
  return typeof v === 'string' && v.length > 0 && v.trim() === '' ? { required: true } : null;
}

function noFutura(control: AbstractControl): ValidationErrors | null {
  const v = control.value as string;
  return v && v > hoy() ? { futura: true } : null;
}

const TITULAR_ANONIMO = 'Anónimo';
const DOCUMENTO_ANONIMO = 'No aplica';

/**
 * Formato E-PL-FO-14 "Operación intentada, inusual o sospechosa" (ROS) v2.0.
 * Cualquier usuario lo puede enviar; solo el administrador consulta los reportes.
 */
@Component({
  selector: 'app-ros-form',
  imports: [ReactiveFormsModule, RouterLink, CampoUI],
  templateUrl: './ros-form.html',
})
export class RosForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly api = inject(ReportesRosService);
  private readonly declarantesApi = inject(DeclarantesService);
  private readonly dependenciasApi = inject(DependenciasService);
  readonly auth = inject(AuthService);

  readonly tiposOperacion: TipoOperacionRos[] = ['Sospechosa', 'Intentada', 'Inusual'];
  readonly tiposTercero: TipoTercero[] = ['Usuario', 'Proveedor', 'Servidor', 'Contratista'];
  readonly tiposIdentificacion = TIPOS_IDENTIFICACION;
  readonly textoAutorizacion = TEXTO_AUTORIZACION_DATOS;
  readonly hoy = hoy();

  /** null = reportar; número = editar (solo administradores) */
  readonly id: number | null = Number(this.route.snapshot.paramMap.get('id')) || null;
  readonly editando = this.id !== null;

  areasApi = signal<string[]>([]);
  actual = signal<ReporteRos | null>(null);
  cargando = signal(true);
  errorCarga = signal('');
  guardando = signal(false);
  error = signal('');
  intento = signal(false);
  /** Reporte enviado por alguien que no es administrador: no puede abrirlo, solo ve la confirmación. */
  enviado = signal<ReporteRos | null>(null);

  readonly form = this.fb.group({
    // Información del reportante
    anonimo: this.fb.nonNullable.control(false),
    id_declarante: this.fb.control<number | null>(null, [Validators.required]),
    // Información del reporte
    fecha_reporte: this.fb.nonNullable.control(hoy(), [Validators.required, noFutura]),
    tipo_operacion: this.fb.control<TipoOperacionRos | null>(null, [Validators.required]),
    area_involucrada: this.fb.nonNullable.control('', [Validators.required]),
    // Tercero involucrado
    nombre_tercero: this.fb.nonNullable.control('', [Validators.required, noVacio, Validators.maxLength(200)]),
    tipo_tercero: this.fb.control<TipoTercero | null>(null, [Validators.required]),
    tipo_identificacion: this.fb.nonNullable.control('', [Validators.required]),
    numero_identificacion: this.fb.nonNullable.control('', [
      Validators.required,
      noVacio,
      Validators.maxLength(30),
      Validators.pattern(/^[A-Za-z0-9-]+$/),
    ]),
    // Descripción, información financiera y análisis
    descripcion: this.fb.nonNullable.control('', [Validators.required, noVacio]),
    valor_economico: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(0),
      Validators.max(9999999999999),
    ]),
    indicios: this.fb.nonNullable.control('', [Validators.required, noVacio]),
    relacion_operaciones: this.fb.nonNullable.control(''),
    observaciones_adicionales: this.fb.nonNullable.control(''),
    // Autorización de datos personales
    autoriza: this.fb.nonNullable.control(false, [Validators.requiredTrue]),
    titular_nombre: this.fb.nonNullable.control('', [Validators.required, noVacio, Validators.maxLength(200)]),
    titular_documento: this.fb.nonNullable.control('', [Validators.required, noVacio, Validators.maxLength(100)]),
  });

  readonly buscador = crearBuscadorDeclarantes(this.form.controls.id_declarante);

  areas = computed(() => {
    const guardada = this.actual()?.area_involucrada;
    const lista = this.areasApi();
    return guardada && !lista.includes(guardada) ? [...lista, guardada] : lista;
  });

  private autoNombre = '';
  private autoDocumento = '';

  constructor() {
    // Reporte anónimo: no hay reportante ni titular que identificar
    this.form.controls.anonimo.valueChanges.pipe(takeUntilDestroyed()).subscribe((anonimo) => {
      const c = this.form.controls;
      if (anonimo) {
        c.id_declarante.reset(null);
        c.id_declarante.disable();
        c.titular_nombre.setValue(TITULAR_ANONIMO);
        c.titular_documento.setValue(DOCUMENTO_ANONIMO);
        c.titular_nombre.disable();
        c.titular_documento.disable();
      } else {
        c.id_declarante.enable();
        c.titular_nombre.enable();
        c.titular_documento.enable();
        if (c.titular_nombre.value === TITULAR_ANONIMO) c.titular_nombre.setValue('');
        if (c.titular_documento.value === DOCUMENTO_ANONIMO) c.titular_documento.setValue('');
        this.autoNombre = '';
        this.autoDocumento = '';
      }
    });

    // Quien reporta suele ser el titular de la autorización: se sugiere su nombre y documento
    effect(() => {
      const d = this.buscador.elegido();
      if (!d || this.form.controls.anonimo.value) return;

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

  ngOnInit(): void {
    forkJoin({
      declarantes: this.declarantesApi.listar({ limit: 1000 }),
      dependencias: this.dependenciasApi.listar(),
      ros: this.id !== null ? this.api.obtener(this.id) : of(null),
    }).subscribe({
      next: ({ declarantes, dependencias, ros }) => {
        this.buscador.declarantes.set(declarantes.data);
        this.areasApi.set(dependencias.data.map((d) => d.nombre));
        if (ros) {
          this.actual.set(ros.data);
          this.rellenar(ros.data);
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

  private rellenar(r: ReporteRos): void {
    this.form.patchValue({
      id_declarante: r.id_declarante,
      fecha_reporte: r.fecha_reporte,
      tipo_operacion: r.tipo_operacion as TipoOperacionRos,
      area_involucrada: r.area_involucrada ?? '',
      nombre_tercero: r.nombre_tercero ?? '',
      tipo_tercero: r.tipo_tercero as TipoTercero,
      tipo_identificacion: r.tipo_identificacion ?? '',
      numero_identificacion: r.numero_identificacion ?? '',
      descripcion: r.descripcion ?? '',
      valor_economico: r.valor_economico,
      indicios: r.indicios ?? '',
      relacion_operaciones: r.relacion_operaciones ?? '',
      observaciones_adicionales: r.observaciones_adicionales ?? '',
      autoriza: r.autoriza_datos === 'SI',
      titular_nombre: r.titular_nombre ?? '',
      titular_documento: r.titular_documento ?? '',
    });
    // Un reporte guardado sin reportante era anónimo
    if (r.id_declarante === null) {
      this.form.controls.anonimo.setValue(true);
      this.form.controls.titular_nombre.setValue(r.titular_nombre ?? TITULAR_ANONIMO);
      this.form.controls.titular_documento.setValue(r.titular_documento ?? DOCUMENTO_ANONIMO);
    }
  }

  mensaje(campo: Campo): string {
    const c = this.form.controls[campo];
    if (!c.invalid || !(c.touched || this.intento())) {
      return '';
    }

    const e = c.errors ?? {};
    if (e['servidor']) return e['servidor'] as string;
    if (e['required']) {
      if (campo === 'id_declarante') return 'Selecciona quién reporta o marca «Reporte anónimo».';
      if (campo === 'autoriza') return 'Debes aceptar la autorización de datos personales para continuar.';
      if (campo === 'tipo_operacion') return 'Selecciona la operación reportada.';
      return 'Este campo es obligatorio.';
    }
    if (e['futura']) return 'La fecha no puede ser posterior a hoy.';
    if (e['min']) return 'El valor no puede ser negativo.';
    if (e['max']) return 'El valor es demasiado grande.';
    if (e['pattern']) return 'Solo letras, números y guion, sin puntos ni espacios.';
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
    const datos: ReporteRosEntrada = {
      id_declarante: v.anonimo ? null : v.id_declarante,
      fecha_reporte: v.fecha_reporte,
      tipo_operacion: v.tipo_operacion as TipoOperacionRos,
      area_involucrada: v.area_involucrada,
      nombre_tercero: v.nombre_tercero.trim(),
      tipo_tercero: v.tipo_tercero as TipoTercero,
      tipo_identificacion: v.tipo_identificacion,
      numero_identificacion: v.numero_identificacion.trim(),
      descripcion: v.descripcion.trim(),
      valor_economico: v.valor_economico as number,
      indicios: v.indicios.trim(),
      relacion_operaciones: v.relacion_operaciones.trim() || null,
      observaciones_adicionales: v.observaciones_adicionales.trim() || null,
      titular_nombre: v.titular_nombre.trim(),
      titular_documento: v.titular_documento.trim(),
      autoriza_datos: v.autoriza ? 'SI' : 'NO',
    };

    this.guardando.set(true);
    const peticion = this.id !== null ? this.api.actualizar(this.id, datos) : this.api.crear(datos);

    peticion.subscribe({
      next: (r) => {
        this.guardando.set(false);

        // Quien no es administrador no puede abrir el reporte: solo se le confirma el envío
        if (!this.auth.esAdmin()) {
          this.enviado.set(r.data);
          return;
        }

        const mensaje = this.editando
          ? `Los cambios de ${r.data.consecutivo} se guardaron correctamente.`
          : `El reporte ${r.data.consecutivo} se registró correctamente.`;
        void this.router.navigate(['/reportes-ros', r.data.id_ros], { state: { mensaje } });
      },
      error: (e) => {
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
          enCampos ? 'Revisa los campos marcados en rojo.' : mensajeApi(e, 'No fue posible enviar el reporte.'),
        );
        this.guardando.set(false);
      },
    });
  }

  /** Vuelve a mostrar el formulario en blanco después de enviar un reporte. */
  otroReporte(): void {
    this.enviado.set(null);
    this.intento.set(false);
    this.form.reset({
      anonimo: false,
      fecha_reporte: hoy(),
      autoriza: false,
    });
    this.form.controls.id_declarante.enable();
    this.form.controls.titular_nombre.enable();
    this.form.controls.titular_documento.enable();
    this.autoNombre = '';
    this.autoDocumento = '';
  }
}
