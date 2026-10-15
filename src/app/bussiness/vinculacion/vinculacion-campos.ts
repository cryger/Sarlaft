import { CampoDef, GrupoDef } from '../../core/campo-def';

/**
 * Campos del formato E-PL-FO-09 "Formato único de vinculación y actualización de terceros".
 * Esta lista alimenta el formulario, las validaciones y el detalle.
 */

const TIPOS_ID = ['CC', 'CE', 'Otro'];
const ES_OTRO = (v: Record<string, any>) => v['tipo_identificacion'] === 'Otro';
const PATRON_ID = /^[A-Za-z0-9-]+$/;

// ------------------------------------------------------------------ encabezado

export const CAMPOS_CABECERA: CampoDef[] = [
  { nombre: 'fecha_diligenciamiento', etiqueta: 'Fecha de diligenciamiento', tipo: 'fecha', requerido: true, noFutura: true },
  { nombre: 'tipo_solicitud', etiqueta: 'Tipo de solicitud', tipo: 'select', requerido: true, opciones: ['Vinculación', 'Actualización de datos'] },
  { nombre: 'clase_vinculacion', etiqueta: 'Clase de vinculación', tipo: 'select', requerido: true, opciones: ['Cliente', 'Proveedor', 'Contratista', 'Accionista'] },
  { nombre: 'tipo_persona', etiqueta: 'Tipo de persona', tipo: 'select', requerido: true, opciones: ['Natural', 'Jurídica'] },
];

// ------------------------------------------------- 1. identificación de persona natural

export const GRUPOS_NATURAL: GrupoDef[] = [
  {
    titulo: 'Identificación',
    campos: [
      { nombre: 'nombres', etiqueta: 'Nombres', tipo: 'texto', requerido: true, max: 150, ancho: 2 },
      { nombre: 'primer_apellido', etiqueta: 'Primer apellido', tipo: 'texto', requerido: true, max: 100 },
      { nombre: 'segundo_apellido', etiqueta: 'Segundo apellido', tipo: 'texto', max: 100 },
      { nombre: 'tipo_identificacion', etiqueta: 'Tipo de identificación', tipo: 'select', requerido: true, opciones: TIPOS_ID },
      { nombre: 'tipo_identificacion_otro', etiqueta: '¿Cuál?', tipo: 'texto', requerido: true, max: 50, visibleSi: ES_OTRO },
      { nombre: 'numero_identificacion', etiqueta: 'No. de identificación', tipo: 'texto', requerido: true, max: 30, patron: PATRON_ID },
      { nombre: 'lugar_expedicion', etiqueta: 'Lugar de expedición', tipo: 'texto', requerido: true, max: 100 },
      { nombre: 'fecha_expedicion', etiqueta: 'Fecha de expedición', tipo: 'fecha', requerido: true, noFutura: true },
      { nombre: 'fecha_nacimiento', etiqueta: 'Fecha de nacimiento', tipo: 'fecha', requerido: true, noFutura: true },
      { nombre: 'lugar_nacimiento', etiqueta: 'Lugar de nacimiento', tipo: 'texto', requerido: true, max: 100 },
      { nombre: 'nacionalidad', etiqueta: 'Nacionalidad', tipo: 'texto', requerido: true, max: 100, valorInicial: 'Colombiana' },
      { nombre: 'estado_civil', etiqueta: 'Estado civil', tipo: 'texto', requerido: true, max: 50 },
      { nombre: 'correo', etiqueta: 'Correo electrónico', tipo: 'correo', requerido: true, max: 150, ancho: 2 },
    ],
  },
  {
    titulo: 'Ubicación y contacto',
    campos: [
      { nombre: 'direccion_residencia', etiqueta: 'Dirección residencia / barrio', tipo: 'texto', requerido: true, max: 200, ancho: 2 },
      { nombre: 'telefono', etiqueta: 'Teléfono / celular', tipo: 'texto', requerido: true, max: 30 },
      { nombre: 'ciudad', etiqueta: 'Ciudad', tipo: 'texto', requerido: true, max: 100 },
      { nombre: 'departamento', etiqueta: 'Departamento', tipo: 'texto', requerido: true, max: 100 },
      { nombre: 'pais', etiqueta: 'País', tipo: 'texto', requerido: true, max: 100, valorInicial: 'Colombia' },
    ],
  },
  {
    titulo: 'Ocupación y actividad económica',
    campos: [
      { nombre: 'ocupacion', etiqueta: 'Ocupación, oficio o profesión principal', tipo: 'select', requerido: true, opciones: ['Asalariado', 'Independiente', 'Pensionado', 'Rentista'], ancho: 2 },
      { nombre: 'declara_renta', etiqueta: '¿Declara renta?', tipo: 'sino', requerido: true, ancho: 2 },
      { nombre: 'actividad_economica', etiqueta: 'Actividad económica principal', tipo: 'texto', requerido: true, max: 200, ancho: 3 },
      { nombre: 'codigo_ciiu', etiqueta: 'Código CIIU', tipo: 'texto', requerido: true, max: 10 },
    ],
  },
  {
    titulo: 'Datos laborales (si aplica)',
    campos: [
      { nombre: 'empresa_labora', etiqueta: 'Empresa donde labora', tipo: 'texto', max: 150, ancho: 2 },
      { nombre: 'cargo', etiqueta: 'Cargo', tipo: 'texto', max: 100 },
      { nombre: 'area', etiqueta: 'Área', tipo: 'texto', max: 100 },
      { nombre: 'direccion_corporativa', etiqueta: 'Dirección corporativa', tipo: 'texto', max: 200, ancho: 2 },
      { nombre: 'telefono_corporativo', etiqueta: 'Teléfono corporativo', tipo: 'texto', max: 30 },
      { nombre: 'ciudad_corporativa', etiqueta: 'Ciudad', tipo: 'texto', max: 100 },
      { nombre: 'departamento_corporativo', etiqueta: 'Departamento', tipo: 'texto', max: 100 },
      { nombre: 'pais_corporativo', etiqueta: 'País', tipo: 'texto', max: 100 },
    ],
  },
];

// ------------------------------------------------ 2. identificación de persona jurídica

export const GRUPOS_JURIDICA: GrupoDef[] = [
  {
    titulo: 'Datos de la empresa',
    campos: [
      { nombre: 'razon_social', etiqueta: 'Nombre o razón social', tipo: 'texto', requerido: true, max: 200, ancho: 2 },
      { nombre: 'nit', etiqueta: 'NIT', tipo: 'texto', requerido: true, max: 20, patron: /^[0-9]+$/, mensajePatron: 'Solo números, sin puntos ni guion.' },
      { nombre: 'dv', etiqueta: 'DV', tipo: 'texto', requerido: true, max: 2, patron: /^[0-9]{1,2}$/, mensajePatron: 'Solo números.' },
      { nombre: 'tipo_empresa', etiqueta: 'Tipo de empresa', tipo: 'select', requerido: true, opciones: ['Pública', 'Privada', 'Mixta', 'Inversión extranjera', 'Otra'] },
      { nombre: 'tipo_empresa_otra', etiqueta: '¿Cuál?', tipo: 'texto', requerido: true, max: 100, visibleSi: (v) => v['tipo_empresa'] === 'Otra' },
      { nombre: 'tipo_actividad', etiqueta: 'Tipo de actividad económica', tipo: 'select', requerido: true, opciones: ['Industrial', 'Comercial', 'Transporte', 'Construcción', 'Agrícola', 'Servicios Financieros', 'Otra'] },
      { nombre: 'tipo_actividad_otra', etiqueta: '¿Cuál?', tipo: 'texto', requerido: true, max: 100, visibleSi: (v) => v['tipo_actividad'] === 'Otra' },
      { nombre: 'actividad_economica', etiqueta: 'Actividad económica principal', tipo: 'texto', requerido: true, max: 200, ancho: 2 },
      { nombre: 'codigo_ciiu', etiqueta: 'Código CIIU', tipo: 'texto', requerido: true, max: 10 },
    ],
  },
  {
    titulo: 'Ubicación y contacto',
    campos: [
      { nombre: 'direccion_principal', etiqueta: 'Dirección oficina principal', tipo: 'texto', requerido: true, max: 200, ancho: 2 },
      { nombre: 'ciudad', etiqueta: 'Ciudad', tipo: 'texto', requerido: true, max: 100 },
      { nombre: 'departamento', etiqueta: 'Departamento', tipo: 'texto', requerido: true, max: 100 },
      { nombre: 'telefono', etiqueta: 'Teléfono', tipo: 'texto', requerido: true, max: 30 },
      { nombre: 'correo_corporativo', etiqueta: 'Correo electrónico corporativo', tipo: 'correo', requerido: true, max: 150, ancho: 2 },
      { nombre: 'celular_corporativo', etiqueta: 'Celular corporativo', tipo: 'texto', max: 30 },
    ],
  },
  {
    titulo: 'Sucursales',
    campos: [
      { nombre: 'tiene_sucursales', etiqueta: '¿Tiene sucursales?', tipo: 'sino', requerido: true, ancho: 4 },
      { nombre: 'direccion_sucursal', etiqueta: 'Dirección sucursal', tipo: 'texto', requerido: true, max: 200, ancho: 2, visibleSi: (v) => v['tiene_sucursales'] === 'SI' },
      { nombre: 'ciudad_sucursal', etiqueta: 'Ciudad / Dpto. / País', tipo: 'texto', requerido: true, max: 150, visibleSi: (v) => v['tiene_sucursales'] === 'SI' },
      { nombre: 'telefono_sucursal', etiqueta: 'Teléfono', tipo: 'texto', requerido: true, max: 30, visibleSi: (v) => v['tiene_sucursales'] === 'SI' },
    ],
  },
];

export const GRUPOS_REPRESENTANTE: GrupoDef[] = [
  {
    titulo: 'Representante legal',
    campos: [
      { nombre: 'nombres', etiqueta: 'Nombres', tipo: 'texto', requerido: true, max: 150, ancho: 2 },
      { nombre: 'primer_apellido', etiqueta: 'Primer apellido', tipo: 'texto', requerido: true, max: 100 },
      { nombre: 'segundo_apellido', etiqueta: 'Segundo apellido', tipo: 'texto', max: 100 },
      { nombre: 'tipo_identificacion', etiqueta: 'Tipo de identificación', tipo: 'select', requerido: true, opciones: TIPOS_ID },
      { nombre: 'tipo_identificacion_otro', etiqueta: '¿Cuál?', tipo: 'texto', requerido: true, max: 50, visibleSi: ES_OTRO },
      { nombre: 'numero_identificacion', etiqueta: 'No. de identificación', tipo: 'texto', requerido: true, max: 30, patron: PATRON_ID },
      { nombre: 'lugar_expedicion', etiqueta: 'Lugar de expedición', tipo: 'texto', requerido: true, max: 100 },
      { nombre: 'fecha_expedicion', etiqueta: 'Fecha de expedición', tipo: 'fecha', requerido: true, noFutura: true },
      { nombre: 'fecha_nacimiento', etiqueta: 'Fecha de nacimiento', tipo: 'fecha', requerido: true, noFutura: true },
      { nombre: 'lugar_nacimiento', etiqueta: 'Lugar de nacimiento', tipo: 'texto', requerido: true, max: 100 },
      { nombre: 'nacionalidad', etiqueta: 'Nacionalidad', tipo: 'texto', requerido: true, max: 100, valorInicial: 'Colombiana' },
      { nombre: 'direccion', etiqueta: 'Dirección', tipo: 'texto', requerido: true, max: 200, ancho: 2 },
      { nombre: 'telefono', etiqueta: 'Teléfono', tipo: 'texto', requerido: true, max: 30 },
    ],
  },
];

// ------------------------------------------------- información tributaria y financiera

export const CAMPOS_TRIBUTARIA: CampoDef[] = [
  { nombre: 'responsable_iva', etiqueta: 'Responsable de IVA', tipo: 'check' },
  { nombre: 'regimen_simple', etiqueta: 'Régimen simple de tributación', tipo: 'check' },
  { nombre: 'gran_contribuyente', etiqueta: 'Gran contribuyente', tipo: 'check' },
  { nombre: 'exterior', etiqueta: 'Exterior', tipo: 'check' },
  { nombre: 'autoretenedor_renta', etiqueta: 'Autoretenedor renta', tipo: 'check' },
  { nombre: 'autoretenedor_iva', etiqueta: 'Autoretenedor IVA', tipo: 'check' },
  { nombre: 'autoretenedor_ica', etiqueta: 'Autoretenedor ICA', tipo: 'check' },
];

export const CAMPOS_FINANCIERA: CampoDef[] = [
  { nombre: 'activos', etiqueta: 'Activos ($)', tipo: 'numero', requerido: true, formato: 'moneda' },
  { nombre: 'pasivos', etiqueta: 'Pasivos ($)', tipo: 'numero', requerido: true, formato: 'moneda' },
  { nombre: 'patrimonio', etiqueta: 'Patrimonio ($)', tipo: 'numero', requerido: true, formato: 'moneda' },
  { nombre: 'ingresos_mensuales', etiqueta: 'Ingresos mensuales ($)', tipo: 'numero', requerido: true, formato: 'moneda' },
  { nombre: 'egresos_mensuales', etiqueta: 'Egresos mensuales ($)', tipo: 'numero', requerido: true, formato: 'moneda' },
  { nombre: 'otros_ingresos', etiqueta: 'Otros ingresos mensuales ($)', tipo: 'numero', formato: 'moneda' },
  { nombre: 'concepto_otros_ingresos', etiqueta: 'Concepto de otros ingresos', tipo: 'texto', max: 200, ancho: 4 },
];

// -------------------------------------------------------------------- 3. accionistas

export const CAMPOS_ACCIONISTA: CampoDef[] = [
  { nombre: 'tipo_identificacion', etiqueta: 'Tipo de identificación', tipo: 'select', requerido: true, opciones: ['CC', 'CE', 'NIT', 'Pasaporte', 'Otro'] },
  { nombre: 'numero_identificacion', etiqueta: 'No. de identificación', tipo: 'texto', requerido: true, max: 30, patron: PATRON_ID },
  { nombre: 'nombre_completo', etiqueta: 'Nombre completo', tipo: 'texto', requerido: true, max: 200, ancho: 2 },
  { nombre: 'porcentaje', etiqueta: '% de participación', tipo: 'numero', requerido: true, minimo: 0.01, maximo: 100, formato: 'porcentaje' },
  { nombre: 'administra_recursos_publicos', etiqueta: '¿Por su actividad o cargo administra recursos públicos?', tipo: 'sino', requerido: true, ancho: 2 },
  { nombre: 'poder_o_reconocimiento_publico', etiqueta: '¿Por su actividad o cargo goza de reconocimiento público o ejerce algún grado de poder público?', tipo: 'sino', requerido: true, ancho: 2 },
];

// --------------------------------------------- operaciones internacionales y productos

export const OPERACIONES_INTERNACIONALES = [
  'Exportaciones',
  'Importaciones',
  'Inversiones',
  'Transferencia',
  'Préstamos',
  'Envío y/o recepción de giros',
  'Ninguna',
];

export const CAMPO_PRODUCTOS_EXTERIOR: CampoDef = {
  nombre: 'productos_exterior',
  etiqueta: '¿Posee productos financieros en el exterior?',
  tipo: 'sino',
  requerido: true,
  ancho: 4,
};

export const CAMPOS_PRODUCTO: CampoDef[] = [
  { nombre: 'tipo_producto', etiqueta: 'Tipo de producto', tipo: 'texto', requerido: true, max: 100 },
  { nombre: 'identificacion_producto', etiqueta: 'Identificación o número del producto', tipo: 'texto', requerido: true, max: 60 },
  { nombre: 'monto', etiqueta: 'Monto', tipo: 'numero', requerido: true, formato: 'moneda' },
  { nombre: 'moneda', etiqueta: 'Moneda', tipo: 'texto', requerido: true, max: 20 },
  { nombre: 'entidad', etiqueta: 'Entidad', tipo: 'texto', requerido: true, max: 150 },
  { nombre: 'ciudad', etiqueta: 'Ciudad', tipo: 'texto', requerido: true, max: 100 },
  { nombre: 'pais', etiqueta: 'País', tipo: 'texto', requerido: true, max: 100 },
];

// ------------------------------------------------- 4. personas expuestas política o públicamente

const PREGUNTAS_PEP = [
  'funcionario_publico',
  'vinculo_familiar_pep',
  'poder_publico',
  'maneja_recursos_publicos',
  'reconocimiento_publico',
  'es_pep',
];

export const CAMPOS_PEP: CampoDef[] = [
  { nombre: 'funcionario_publico', etiqueta: '¿Es o fue un funcionario, empleado de una entidad pública controlada por el gobierno?', tipo: 'sino', requerido: true, ancho: 4 },
  { nombre: 'vinculo_familiar_pep', etiqueta: '¿Tiene usted algún vínculo familiar con una persona considerada públicamente expuesta?', tipo: 'sino', requerido: true, ancho: 4 },
  { nombre: 'poder_publico', etiqueta: '¿Por su cargo o actividad ejerce algún grado de poder público?', tipo: 'sino', requerido: true, ancho: 4 },
  { nombre: 'maneja_recursos_publicos', etiqueta: '¿Maneja recursos públicos?', tipo: 'sino', requerido: true, ancho: 4 },
  { nombre: 'reconocimiento_publico', etiqueta: '¿Goza usted de algún reconocimiento público?', tipo: 'sino', requerido: true, ancho: 4 },
  { nombre: 'es_pep', etiqueta: '¿Declara usted que tiene la condición de ser una persona políticamente expuesta - PEP?', tipo: 'sino', requerido: true, ancho: 4 },
  {
    nombre: 'detalle',
    etiqueta: 'Si respondió afirmativamente a alguna de las preguntas anteriores, indique nombres, cargos, vínculo familiar y/o la entidad pública en la que fue o es funcionario',
    tipo: 'area',
    requerido: true,
    ancho: 4,
    visibleSi: (v) => PREGUNTAS_PEP.some((p) => v[p] === 'SI'),
  },
];

// ------------------------------------------------- 5, 6 y 7: origen de fondos, datos y firma

export const CAMPOS_ORIGEN: CampoDef[] = [
  { nombre: 'origen_fondos', etiqueta: 'Origen de fondos (especifique de dónde provienen sus fondos)', tipo: 'area', requerido: true, ancho: 4 },
  { nombre: 'acepta_declaracion', etiqueta: 'Declaro expresamente lo anterior y acepto la declaración de origen de fondos.', tipo: 'check', requerido: true, ancho: 4 },
];

export const CAMPOS_AUTORIZACION: CampoDef[] = [
  { nombre: 'acepta', etiqueta: 'Consiento y autorizo a la E.S.E. Hospital San José del Guaviare para tratar mis datos personales, conforme a su política de tratamiento de datos.', tipo: 'check', requerido: true, ancho: 4 },
];

export const CAMPOS_FIRMA: CampoDef[] = [
  { nombre: 'firmante_nombre', etiqueta: 'Nombre de quien firma (persona natural o representante legal)', tipo: 'texto', requerido: true, max: 200, ancho: 3 },
  { nombre: 'firma_fisica', etiqueta: 'El formato impreso, con firma y huella, reposa en el expediente', tipo: 'check', ancho: 4 },
];

// ----------------------------------------------------------------- textos del formato

export const TEXTO_ORIGEN_FONDOS = [
  'La información que he suministrado en este documento es veraz y verificable y me comprometo a actualizarla anualmente.',
  'Tanto mis actividades, profesión u oficio son lícitas, las ejerzo dentro del marco legal y los recursos que poseo no provienen de actividades ilícitas de las contempladas en el Código Penal Colombiano o en cualquier norma que lo sustituya, adicione o modifique.',
  'Los recursos que se deriven del desarrollo de este contrato no serán destinados a la financiación del terrorismo, actividades terroristas o grupos terroristas.',
  'Acepto que la E.S.E. Hospital San José del Guaviare está en la obligación legal de solicitar las aclaraciones que estime pertinentes, en el evento en que se presenten circunstancias con base en las cuales se pueda tener dudas razonables sobre mis transacciones, así como del origen de mis fondos, evento en el cual suministraré las aclaraciones que sean necesarias del caso.',
  'Los recursos que poseo provienen de la(s) siguiente(s) actividad(es):',
];

export const TEXTO_DATOS_PERSONALES = [
  'Dando cumplimiento a lo dispuesto en la Ley 1581 de 2012 y de conformidad con lo señalado en el Decreto 1377 de 2013, con la firma de este documento manifiesto que he sido informado por la E.S.E. Hospital San José del Guaviare de lo siguiente:',
  '1. La E.S.E. actuará como responsable del tratamiento de los datos personales de los cuales soy titular y podrá recolectar, usar y tratar dichos datos conforme a su política de privacidad.',
  '2. Garantiza la confidencialidad, libertad, seguridad, veracidad, transparencia, acceso y circulación restringida de los datos personales.',
  '3. Es de carácter facultativo responder preguntas que traten sobre datos sensibles o sobre menores de edad.',
  '4. Puedo acceder en cualquier momento a los datos suministrados, así como solicitar su corrección, actualización o supresión, y revocar la autorización otorgada, escribiendo a oficialdecumplimiento@esehospitalguaviare.gov.co.',
  '5. Autorizo a la E.S.E. a consultar y verificar mis datos en las centrales de información y/o bases de datos públicas, especialmente en las listas establecidas para el control y prevención de lavado de activos y financiación del terrorismo.',
];
