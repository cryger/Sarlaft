import { RenderMode, ServerRoute } from '@angular/ssr';

// Sistema interno con datos de una API: se renderiza en el navegador.
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
