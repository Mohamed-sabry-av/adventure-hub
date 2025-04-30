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
  {
    path: 'Cookies-Policy',
    loadComponent: () =>
      import('../terms,about,contactUs/page/cookies/cookies.component').then(
        (m) => m.CookiesPolicyComponent
      ),
  },
  {
    path: 'return-Policy',
    loadComponent: () =>
      import(
        '../terms,about,contactUs/page/return-policy/return-policy.component'
      ).then((m) => m.RefundPolicyComponent),
  },

  {
    path: 'contact-us',
    loadComponent: () =>
      import(
        '../terms,about,contactUs/page/contactUs/contact-us.component'
      ).then((m) => m.ContactUsComponent),
  },
];
