import { Routes } from '@angular/router';

export const pagesRoutes: Routes = [
  {
    path: 'terms',
    loadComponent: () =>
      import('../terms,about,contactUs/page/terms/terms.component').then(
        (m) => m.TermsComponent
      ),
  },
  {
    path: 'about-us',
    loadComponent: () =>
      import('../terms,about,contactUs/page/AboutUs/about-us.component').then(
        (m) => m.AboutUsComponent
      ),
  },
];