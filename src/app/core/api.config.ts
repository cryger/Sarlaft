import { isDevMode } from '@angular/core';

// 1) Mientras desarrollas (ng serve):
//    - API en tu XAMPP local ........ 'http://localhost/sarlaft-api'
//    - API ya subida al hosting ..... 'https://TU-DOMINIO.com/sarlaft-api'
const API_DESARROLLO = 'http://localhost/sarlaft-api';

// 2) Cuando publiques (ng build): la URL de tu API en el hosting
const API_PRODUCCION = 'https://esehospitalguaviare.gov.co/sarlaft-api';

export const API_URL = isDevMode() ? API_DESARROLLO : API_PRODUCCION;
