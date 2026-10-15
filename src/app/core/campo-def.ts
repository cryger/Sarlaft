import { AbstractControl, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

import { formatoFecha, formatoMoneda, hoy } from './formato';

/**
 * Definición de un campo de formulario. Una sola lista de definiciones alimenta
 * el formulario (controles y validaciones), su dibujo en pantalla y el detalle.
 */
export type TipoCampo = 'texto' | 'fecha' | 'numero' | 'correo' | 'select' | 'sino' | 'area' | 'check';

export interface CampoDef {
  nombre: string;
  etiqueta: string;
  tipo: TipoCampo;
  requerido?: boolean;
  /** Longitud máxima de un texto. */
  max?: number;
  /** Límites de un número. */
  minimo?: number;
  maximo?: number;
  opciones?: string[];
  /** Columnas que ocupa en la cuadrícula de 4 (por defecto 1). */
  ancho?: 1 | 2 | 3 | 4;
  /** Si se define, el campo solo aparece (y solo es obligatorio) cuando devuelve true. */
  visibleSi?: (valores: Record<string, any>) => boolean;
  noFutura?: boolean;
  valorInicial?: string;
  patron?: RegExp;
  mensajePatron?: string;
  formato?: 'moneda' | 'porcentaje';
  ayuda?: string;
}

export interface GrupoDef {
  titulo: string;
  campos: CampoDef[];
}

export const SI_NO = [
  { valor: 'SI', etiqueta: 'Sí' },
  { valor: 'NO', etiqueta: 'No' },
];

export const camposDe = (grupos: GrupoDef[]): CampoDef[] => grupos.flatMap((g) => g.campos);

export function vacio(v: unknown): boolean {
  return v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
}

function noFutura(control: AbstractControl): ValidationErrors | null {
  const v = control.value as string;
  return v && v > hoy() ? { futura: true } : null;
}

function requerido(c: CampoDef): ValidatorFn {
  if (c.tipo === 'check') return Validators.requiredTrue;
  return (control) => (vacio(control.value) ? { required: true } : null);
}

/** Obligatorio solo mientras el campo está visible (depende de otros campos del mismo grupo). */
function requeridoSi(c: CampoDef): ValidatorFn {
  return (control) => {
    const grupo = control.parent;
    if (!grupo || !c.visibleSi!(grupo.getRawValue())) return null;
    return vacio(control.value) ? { required: true } : null;
  };
}

/** Crea el grupo de controles y sus validaciones a partir de las definiciones. */
export function construirGrupo(campos: CampoDef[]): FormGroup {
  const controles: Record<string, FormControl> = {};

  for (const c of campos) {
    const validadores: ValidatorFn[] = [];
    if (c.requerido) validadores.push(c.visibleSi ? requeridoSi(c) : requerido(c));
    if (c.max) validadores.push(Validators.maxLength(c.max));
    if (c.tipo === 'correo') validadores.push(Validators.email);
    if (c.patron) validadores.push(Validators.pattern(c.patron));
    if (c.tipo === 'numero') {
      validadores.push(Validators.min(c.minimo ?? 0));
      if (c.maximo !== undefined) validadores.push(Validators.max(c.maximo));
    }
    if (c.noFutura) validadores.push(noFutura);

    const inicial = c.tipo === 'check' ? false : c.tipo === 'numero' ? null : (c.valorInicial ?? '');
    controles[c.nombre] = new FormControl(inicial, validadores);
  }

  const grupo = new FormGroup(controles);

  // Al cambiar un campo hay que volver a evaluar los obligatorios que dependen de otros
  const condicionales = campos.filter((c) => c.visibleSi && c.requerido);
  if (condicionales.length) {
    grupo.valueChanges.subscribe(() =>
      condicionales.forEach((c) => grupo.controls[c.nombre].updateValueAndValidity({ emitEvent: false })),
    );
  }

  return grupo;
}

/** Texto de error de un control (vacío si no hay que mostrarlo todavía). */
export function mensajeCampo(c: AbstractControl | null, def: CampoDef, intento: boolean): string {
  if (!c || !c.invalid || !(c.touched || intento)) return '';

  const e = c.errors ?? {};
  if (e['servidor']) return e['servidor'] as string;
  if (e['required']) return def.tipo === 'check' ? 'Debes aceptar para continuar.' : 'Este campo es obligatorio.';
  if (e['futura']) return 'La fecha no puede ser posterior a hoy.';
  if (e['email']) return 'Escribe un correo válido, por ejemplo nombre@dominio.com.';
  if (e['pattern']) return def.mensajePatron ?? 'Solo letras, números y guion.';
  if (e['maxlength']) return `Máximo ${e['maxlength'].requiredLength} caracteres.`;
  if (e['min']) return `Debe ser mayor o igual a ${e['min'].min}.`;
  if (e['max']) return `Debe ser menor o igual a ${e['max'].max}.`;
  return 'Valor no válido.';
}

/** Valor legible de un campo para el detalle. */
export function textoValor(c: CampoDef, v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (c.tipo === 'sino') return v === 'SI' ? 'Sí' : v === 'NO' ? 'No' : String(v);
  if (c.tipo === 'check') return v ? 'Sí' : 'No';
  if (c.tipo === 'fecha') return formatoFecha(String(v));
  if (c.tipo === 'numero') {
    return c.formato === 'moneda' ? formatoMoneda(Number(v)) : c.formato === 'porcentaje' ? `${v} %` : String(v);
  }
  return String(v);
}
