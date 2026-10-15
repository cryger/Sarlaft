import { Component, inject } from '@angular/core';

import { CampoDef, GrupoDef, textoValor } from '../../core/campo-def';
import { formatoFecha } from '../../core/formato';
import { Vinculacion, VinculacionTercerosService } from '../../shared/services/vinculacion-terceros';
import { ConfigDetalle, SeccionDetalle } from '../formularios/formulario-config';
import { FormularioDetalle } from '../formularios/formulario-detalle';
import {
  CAMPOS_FINANCIERA,
  CAMPOS_PEP,
  CAMPOS_TRIBUTARIA,
  GRUPOS_JURIDICA,
  GRUPOS_NATURAL,
  GRUPOS_REPRESENTANTE,
} from './vinculacion-campos';

type Datos = NonNullable<Vinculacion['formulario']>;
type Origen = keyof Datos;

/** El "¿Cuál?" se muestra junto a su opción: "Otro: Libreta militar". */
const CON_OTRO: Record<string, string> = {
  tipo_identificacion: 'tipo_identificacion_otro',
  tipo_empresa: 'tipo_empresa_otra',
  tipo_actividad: 'tipo_actividad_otra',
};

const esJuridica = (f: Vinculacion) => f.tipo_persona === 'Jurídica';
const esNatural = (f: Vinculacion) => f.tipo_persona !== 'Jurídica';

/** Convierte las definiciones de campos en una sección del detalle. */
function seccion(
  titulo: string,
  campos: CampoDef[],
  origen: Origen,
  columnas: 2 | 3 = 3,
  ocultaSi?: (f: Vinculacion) => boolean,
): SeccionDetalle<Vinculacion> {
  return {
    titulo,
    columnas,
    ocultaSi,
    campos: campos
      .filter((c) => !Object.values(CON_OTRO).includes(c.nombre))
      .map((c) => ({
        etiqueta: c.etiqueta,
        completo: c.tipo === 'area',
        multilinea: c.tipo === 'area',
        valor: (f: Vinculacion) => {
          const datos = (f.formulario?.[origen] ?? {}) as Record<string, any>;
          const base = textoValor(c, datos[c.nombre]);
          const otro = CON_OTRO[c.nombre] ? datos[CON_OTRO[c.nombre]] : null;
          return otro ? `${base}: ${otro}` : base;
        },
      })),
  };
}

const secciones = (grupos: GrupoDef[], prefijo: string, origen: Origen, ocultaSi: (f: Vinculacion) => boolean) =>
  grupos.map((g) => seccion(`${prefijo} · ${g.titulo}`, g.campos, origen, 3, ocultaSi));

const siNo = (v: unknown) => (v === 'SI' ? 'Sí' : v === 'NO' ? 'No' : '—');

/** Detalle del formato E-PL-FO-09 (Vinculación y actualización de terceros). */
@Component({
  selector: 'app-vinculacion-detalle',
  imports: [FormularioDetalle],
  template: `<app-formulario-detalle [config]="config" [api]="api" />`,
})
export class VinculacionDetalle {
  readonly api = inject(VinculacionTercerosService);

  readonly config: ConfigDetalle<Vinculacion> = {
    titulo: (v) => `Vinculación ${v.consecutivo}`,
    subtitulo: 'Formato E-PL-FO-09 · Vinculación y actualización de terceros',
    ruta: '/vinculacion-terceros',
    id: (v) => v.id_vinculacion,
    sustantivo: 'formato',
    femenino: false,
    observacionRevision: (v) => v.observacion_revision,
    secciones: [
      {
        titulo: 'Solicitud',
        columnas: 3,
        campos: [
          { etiqueta: 'Fecha de diligenciamiento', valor: (v) => formatoFecha(v.fecha_diligenciamiento) },
          { etiqueta: 'Tipo de solicitud', valor: (v) => v.tipo_solicitud },
          { etiqueta: 'Clase de vinculación', valor: (v) => v.clase_vinculacion },
          { etiqueta: 'Tipo de persona', valor: (v) => v.tipo_persona },
          { etiqueta: 'Tercero', valor: (v) => `${v.tercero_nombre ?? '—'} (${v.tercero_tipo_id ?? ''} ${v.tercero_numero_id ?? ''})` },
          { etiqueta: 'Alerta PEP', valor: (v) => (v.alerta_pep === 'SI' ? 'Sí: alguna respuesta de la sección 4 es afirmativa' : 'Sin alerta') },
        ],
      },
      ...secciones(GRUPOS_NATURAL, '1. Persona natural', 'persona', esJuridica),
      ...secciones(GRUPOS_JURIDICA, '2. Persona jurídica', 'persona', esNatural),
      ...secciones(GRUPOS_REPRESENTANTE, '2. Persona jurídica', 'representante', esNatural),
      {
        titulo: 'Información tributaria',
        columnas: 2,
        campos: [
          {
            etiqueta: 'Condiciones marcadas',
            completo: true,
            valor: (v) => {
              const t = (v.formulario?.tributaria ?? {}) as Record<string, boolean>;
              const marcadas = CAMPOS_TRIBUTARIA.filter((c) => t[c.nombre]).map((c) => c.etiqueta);
              return marcadas.length ? marcadas.join(', ') : 'Ninguna';
            },
          },
        ],
      },
      seccion('Información financiera', CAMPOS_FINANCIERA, 'financiera'),
      {
        titulo: '3. Accionistas con más del 5% del capital',
        columnas: 2,
        ocultaSi: esNatural,
        campos: [
          {
            etiqueta: 'Accionistas',
            completo: true,
            multilinea: true,
            valor: (v) => {
              const filas = v.formulario?.accionistas ?? [];
              return filas.length
                ? filas
                    .map(
                      (a, i) =>
                        `${i + 1}. ${a['nombre_completo']} (${a['tipo_identificacion']} ${a['numero_identificacion']}) · ${a['porcentaje']} % · ` +
                        `Administra recursos públicos: ${siNo(a['administra_recursos_publicos'])} · ` +
                        `Reconocimiento o poder público: ${siNo(a['poder_o_reconocimiento_publico'])}`,
                    )
                    .join('\n')
                : 'No se registraron accionistas';
            },
          },
        ],
      },
      {
        titulo: 'Operaciones internacionales',
        columnas: 2,
        campos: [
          {
            etiqueta: 'Operaciones que realiza',
            completo: true,
            valor: (v) => (v.formulario?.internacional.operaciones ?? []).join(', ') || '—',
          },
          {
            etiqueta: '¿Posee productos financieros en el exterior?',
            valor: (v) => siNo(v.formulario?.internacional.productos_exterior),
          },
          {
            etiqueta: 'Productos en el exterior',
            completo: true,
            multilinea: true,
            valor: (v) => {
              const filas = v.formulario?.internacional.productos ?? [];
              return filas.length
                ? filas
                    .map(
                      (p, i) =>
                        `${i + 1}. ${p['tipo_producto']} · N.º ${p['identificacion_producto']} · ${p['monto']} ${p['moneda']} · ` +
                        `${p['entidad']} (${p['ciudad']}, ${p['pais']})`,
                    )
                    .join('\n')
                : 'No aplica';
            },
          },
        ],
      },
      seccion('4. Personas expuestas política o públicamente (PEP)', CAMPOS_PEP, 'pep', 2),
      {
        titulo: '5. Declaración de origen de fondos',
        columnas: 2,
        campos: [
          { etiqueta: 'Origen de fondos', completo: true, multilinea: true, valor: (v) => v.formulario?.origen.origen_fondos || '—' },
          { etiqueta: 'Declaración aceptada', valor: (v) => (v.formulario?.origen.acepta_declaracion ? 'Sí' : 'No') },
        ],
      },
      {
        titulo: '6 y 7. Autorización de datos y firma',
        columnas: 3,
        campos: [
          { etiqueta: 'Autorización de datos personales', valor: (v) => (v.formulario?.autorizacion.acepta ? 'Aceptada' : 'No aceptada') },
          { etiqueta: 'Firmante', valor: (v) => v.formulario?.firma.firmante_nombre || '—' },
          { etiqueta: 'Formato firmado en el expediente', valor: (v) => (v.formulario?.firma.firma_fisica ? 'Sí' : 'No') },
        ],
      },
    ],
  };
}
