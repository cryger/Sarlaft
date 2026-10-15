import { Component, ElementRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { mensajeApi } from '../../core/api.types';
import { AuthService } from '../../core/auth.service';
import { camposDe, construirGrupo } from '../../core/campo-def';
import { hoy } from '../../core/formato';
import { CamposDinamicos } from '../../shared/components/campos-dinamicos/campos-dinamicos';
import {
  DatosVinculacion,
  TipoPersona,
  Vinculacion,
  VinculacionEntrada,
  VinculacionTercerosService,
} from '../../shared/services/vinculacion-terceros';
import {
  CAMPOS_ACCIONISTA,
  CAMPOS_AUTORIZACION,
  CAMPOS_CABECERA,
  CAMPOS_FINANCIERA,
  CAMPOS_FIRMA,
  CAMPOS_ORIGEN,
  CAMPOS_PEP,
  CAMPOS_PRODUCTO,
  CAMPOS_TRIBUTARIA,
  CAMPO_PRODUCTOS_EXTERIOR,
  GRUPOS_JURIDICA,
  GRUPOS_NATURAL,
  GRUPOS_REPRESENTANTE,
  OPERACIONES_INTERNACIONALES,
  TEXTO_DATOS_PERSONALES,
  TEXTO_ORIGEN_FONDOS,
} from './vinculacion-campos';

const CAMPOS_DE_CABECERA = CAMPOS_CABECERA.map((c) => c.nombre);

/** Con productos en el exterior = SI debe haber al menos un producto. */
function conProductos(grupo: AbstractControl): ValidationErrors | null {
  const sino = grupo.get('productos_exterior')?.value;
  const filas = grupo.get('productos') as FormArray | null;
  return sino === 'SI' && filas && filas.length === 0 ? { sinProductos: true } : null;
}

/** Debe marcarse al menos una operación internacional (o "Ninguna"). */
function algunaOperacion(control: AbstractControl): ValidationErrors | null {
  return Array.isArray(control.value) && control.value.length > 0 ? null : { required: true };
}

/**
 * Formato E-PL-FO-09 "Formato único de vinculación y actualización de terceros".
 * Los campos se dibujan y validan a partir de las definiciones de vinculacion-campos.ts.
 */
@Component({
  selector: 'app-vinculacion-form',
  imports: [ReactiveFormsModule, RouterLink, CamposDinamicos],
  templateUrl: './vinculacion-form.html',
})
export class VinculacionForm implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly api = inject(VinculacionTercerosService);
  readonly auth = inject(AuthService);

  // Definiciones y textos (para la plantilla)
  readonly cabecera = CAMPOS_CABECERA;
  readonly gruposNatural = GRUPOS_NATURAL;
  readonly gruposJuridica = GRUPOS_JURIDICA;
  readonly gruposRepresentante = GRUPOS_REPRESENTANTE;
  readonly tributaria = CAMPOS_TRIBUTARIA;
  readonly financiera = CAMPOS_FINANCIERA;
  readonly camposAccionista = CAMPOS_ACCIONISTA;
  readonly camposProducto = CAMPOS_PRODUCTO;
  readonly campoProductosExterior = [CAMPO_PRODUCTOS_EXTERIOR];
  readonly camposPep = CAMPOS_PEP;
  readonly camposOrigen = CAMPOS_ORIGEN;
  readonly camposAutorizacion = CAMPOS_AUTORIZACION;
  readonly camposFirma = CAMPOS_FIRMA;
  readonly operaciones = OPERACIONES_INTERNACIONALES;
  readonly textoOrigen = TEXTO_ORIGEN_FONDOS;
  readonly textoDatos = TEXTO_DATOS_PERSONALES;

  /** null = registrar; número = editar */
  readonly id: number | null = Number(this.route.snapshot.paramMap.get('id')) || null;
  readonly editando = this.id !== null;

  actual = signal<Vinculacion | null>(null);
  cargando = signal(this.id !== null);
  errorCarga = signal('');
  guardando = signal(false);
  error = signal('');
  intento = signal(false);

  // ---- Controles (un grupo por sección del formato)
  readonly gCabecera = construirGrupo(CAMPOS_CABECERA);
  readonly gNatural = construirGrupo(camposDe(GRUPOS_NATURAL));
  readonly gJuridica = construirGrupo(camposDe(GRUPOS_JURIDICA));
  readonly gRepresentante = construirGrupo(camposDe(GRUPOS_REPRESENTANTE));
  readonly gTributaria = construirGrupo(CAMPOS_TRIBUTARIA);
  readonly gFinanciera = construirGrupo(CAMPOS_FINANCIERA);
  readonly accionistas = new FormArray<FormGroup>([]);
  readonly productos = new FormArray<FormGroup>([]);
  readonly gInternacional = new FormGroup(
    {
      operaciones: new FormControl<string[]>([], { nonNullable: true, validators: [algunaOperacion] }),
      productos_exterior: new FormControl('', [Validators.required]),
      productos: this.productos,
    },
    { validators: [conProductos] },
  );
  readonly gPep = construirGrupo(CAMPOS_PEP);
  readonly gOrigen = construirGrupo(CAMPOS_ORIGEN);
  readonly gAutorizacion = construirGrupo(CAMPOS_AUTORIZACION);
  readonly gFirma = construirGrupo(CAMPOS_FIRMA);

  readonly form = new FormGroup({
    cabecera: this.gCabecera,
    natural: this.gNatural,
    juridica: this.gJuridica,
    representante: this.gRepresentante,
    tributaria: this.gTributaria,
    financiera: this.gFinanciera,
    accionistas: this.accionistas,
    internacional: this.gInternacional,
    pep: this.gPep,
    origen: this.gOrigen,
    autorizacion: this.gAutorizacion,
    firma: this.gFirma,
  });

  readonly tipoPersona = toSignal(this.gCabecera.controls['tipo_persona'].valueChanges, { initialValue: '' });
  readonly productosExterior = toSignal(this.gInternacional.controls['productos_exterior'].valueChanges, { initialValue: '' });
  readonly operacionesMarcadas = toSignal(this.gInternacional.controls['operaciones'].valueChanges, { initialValue: [] as string[] });

  readonly esNatural = computed(() => this.tipoPersona() === 'Natural');
  readonly esJuridica = computed(() => this.tipoPersona() === 'Jurídica');

  /** Un gestor no puede editar un formato que ya fue revisado. */
  bloqueada = computed(() => {
    const v = this.actual();
    return !!v && !this.auth.esAdmin() && v.estado !== 'Pendiente';
  });

  constructor() {
    this.gCabecera.controls['fecha_diligenciamiento'].setValue(hoy());

    // Solo se validan y se envían las secciones que corresponden al tipo de persona
    this.gCabecera.controls['tipo_persona'].valueChanges.pipe(takeUntilDestroyed()).subscribe((t) => this.aplicarTipo(t));
    this.gInternacional.controls['productos_exterior'].valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((v) => this.aplicarProductos(v));
    this.aplicarTipo('');
    this.aplicarProductos('');
  }

  ngOnInit(): void {
    if (this.id === null) return;

    this.api.obtener(this.id).subscribe({
      next: (r) => {
        this.actual.set(r.data);
        this.rellenar(r.data);
        this.cargando.set(false);
      },
      error: (e) => {
        this.errorCarga.set(mensajeApi(e, 'No fue posible cargar el formato.'));
        this.cargando.set(false);
      },
    });
  }

  // ------------------------------------------------------- secciones según el tipo

  private alternar(control: AbstractControl, activo: boolean): void {
    if (activo) control.enable({ emitEvent: false });
    else control.disable({ emitEvent: false });
  }

  private aplicarTipo(tipo: string): void {
    const natural = tipo === 'Natural';
    const juridica = tipo === 'Jurídica';
    this.alternar(this.gNatural, natural);
    this.alternar(this.gJuridica, juridica);
    this.alternar(this.gRepresentante, juridica);
    this.alternar(this.accionistas, juridica);
  }

  private aplicarProductos(sino: string | null): void {
    this.alternar(this.productos, sino === 'SI');
  }

  // ------------------------------------------------------------------- filas

  private nuevaFila(campos: typeof CAMPOS_ACCIONISTA, valores?: Record<string, unknown>): FormGroup {
    const g = construirGrupo(campos);
    if (valores) g.patchValue(valores);
    return g;
  }

  agregarAccionista(): void {
    if (this.accionistas.length < 50) this.accionistas.push(this.nuevaFila(CAMPOS_ACCIONISTA));
  }

  quitarAccionista(i: number): void {
    this.accionistas.removeAt(i);
  }

  agregarProducto(): void {
    if (this.productos.length < 20) {
      this.productos.push(this.nuevaFila(CAMPOS_PRODUCTO));
      this.gInternacional.updateValueAndValidity();
    }
  }

  quitarProducto(i: number): void {
    this.productos.removeAt(i);
    this.gInternacional.updateValueAndValidity();
  }

  // ----------------------------------------------------- operaciones internacionales

  marcada(op: string): boolean {
    return this.operacionesMarcadas().includes(op);
  }

  alternarOperacion(op: string, marcada: boolean): void {
    const control = this.gInternacional.controls['operaciones'] as FormControl<string[]>;
    let lista = control.value.filter((o) => o !== op);
    if (marcada) {
      // "Ninguna" excluye a las demás, y viceversa
      lista = op === 'Ninguna' ? ['Ninguna'] : [...lista.filter((o) => o !== 'Ninguna'), op];
    }
    control.setValue(lista);
    control.markAsTouched();
  }

  errorOperaciones(): string {
    const c = this.gInternacional.controls['operaciones'];
    if (!c.invalid || !(c.touched || this.intento())) return '';
    return (c.errors?.['servidor'] as string | undefined) ?? 'Marca al menos una opción (o "Ninguna").';
  }

  errorProductos(): string {
    const e = this.productos.errors?.['servidor'] as string | undefined;
    if (e) return e;
    return this.gInternacional.hasError('sinProductos') && (this.intento() || this.productos.touched)
      ? 'Agrega al menos un producto financiero en el exterior.'
      : '';
  }

  // ----------------------------------------------------------------- cargar datos

  private rellenar(v: Vinculacion): void {
    const f = v.formulario as DatosVinculacion;

    this.gCabecera.patchValue({
      fecha_diligenciamiento: v.fecha_diligenciamiento,
      tipo_solicitud: v.tipo_solicitud,
      clase_vinculacion: v.clase_vinculacion,
      tipo_persona: v.tipo_persona,
    });
    this.aplicarTipo(v.tipo_persona);

    (v.tipo_persona === 'Jurídica' ? this.gJuridica : this.gNatural).patchValue(f.persona);
    if (f.representante) this.gRepresentante.patchValue(f.representante);
    this.gTributaria.patchValue(f.tributaria);
    this.gFinanciera.patchValue(f.financiera);

    this.accionistas.clear();
    for (const a of f.accionistas ?? []) this.accionistas.push(this.nuevaFila(CAMPOS_ACCIONISTA, a));

    this.gInternacional.controls['operaciones'].setValue(f.internacional.operaciones);
    this.gInternacional.controls['productos_exterior'].setValue(f.internacional.productos_exterior ?? '');
    this.aplicarProductos(f.internacional.productos_exterior);
    this.productos.clear();
    for (const p of f.internacional.productos ?? []) this.productos.push(this.nuevaFila(CAMPOS_PRODUCTO, p));

    this.gPep.patchValue(f.pep);
    this.gOrigen.patchValue(f.origen);
    this.gAutorizacion.patchValue(f.autorizacion);
    this.gFirma.patchValue(f.firma);
    this.gInternacional.updateValueAndValidity();
  }

  // ----------------------------------------------------------------------- guardar

  private limpiar(valores: Record<string, any>): Record<string, any> {
    return Object.fromEntries(Object.entries(valores).map(([k, x]) => [k, typeof x === 'string' ? x.trim() : x]));
  }

  private construir(): VinculacionEntrada {
    const cab = this.gCabecera.getRawValue() as VinculacionEntrada;
    const juridica = cab.tipo_persona === 'Jurídica';
    const sinProductos = this.gInternacional.controls['productos_exterior'].value !== 'SI';

    return {
      tipo_solicitud: cab.tipo_solicitud,
      clase_vinculacion: cab.clase_vinculacion,
      tipo_persona: cab.tipo_persona as TipoPersona,
      fecha_diligenciamiento: cab.fecha_diligenciamiento,
      formulario: {
        persona: this.limpiar((juridica ? this.gJuridica : this.gNatural).getRawValue()),
        ...(juridica ? { representante: this.limpiar(this.gRepresentante.getRawValue()) } : {}),
        tributaria: this.gTributaria.getRawValue(),
        financiera: this.limpiar(this.gFinanciera.getRawValue()),
        accionistas: juridica ? this.accionistas.getRawValue().map((a) => this.limpiar(a)) : [],
        internacional: {
          operaciones: this.gInternacional.controls['operaciones'].value as string[],
          productos_exterior: this.gInternacional.controls['productos_exterior'].value,
          productos: sinProductos ? [] : this.productos.getRawValue().map((p) => this.limpiar(p)),
        },
        pep: this.limpiar(this.gPep.getRawValue()),
        origen: this.limpiar(this.gOrigen.getRawValue()) as DatosVinculacion['origen'],
        autorizacion: this.gAutorizacion.getRawValue() as DatosVinculacion['autorizacion'],
        firma: this.limpiar(this.gFirma.getRawValue()) as DatosVinculacion['firma'],
      },
    };
  }

  /** La API habla de "persona.x"; en el formulario ese grupo se llama "natural" o "juridica". */
  private ruta(campo: string): string {
    if (campo.startsWith('persona.')) {
      return (this.esJuridica() ? 'juridica.' : 'natural.') + campo.slice('persona.'.length);
    }
    return CAMPOS_DE_CABECERA.includes(campo) ? `cabecera.${campo}` : campo;
  }

  guardar(): void {
    if (this.guardando()) return;

    this.intento.set(true);
    this.error.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Revisa los campos marcados en rojo.');
      this.host.nativeElement
        .querySelector<HTMLElement>('input.ng-invalid, select.ng-invalid, textarea.ng-invalid')
        ?.focus();
      return;
    }

    const datos = this.construir();
    this.guardando.set(true);
    const peticion = this.id !== null ? this.api.actualizar(this.id, datos) : this.api.crear(datos);

    peticion.subscribe({
      next: (r) => {
        const mensaje = this.editando
          ? `Los cambios de ${r.data.consecutivo} se guardaron correctamente.`
          : `El formato ${r.data.consecutivo} se registró correctamente.`;
        void this.router.navigate(['/vinculacion-terceros', r.data.id_vinculacion], { state: { mensaje } });
      },
      error: (e) => {
        const errores = (e?.error?.errors ?? {}) as Record<string, string>;
        let enCampos = false;
        for (const [campo, texto] of Object.entries(errores)) {
          const control = this.form.get(this.ruta(campo));
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
