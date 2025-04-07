import { Routes } from '@angular/router';

export const productsRoutes: Routes = [
  {
    path: 'sale',
    loadComponent: () =>
      import('../products/pages/products-by-sale/products-by-sale.component').then(
        (m) => m.ProductsBySaleComponent
      ),
    data: { breadcrumb: 'sale' },
  },
  {
    path: 'brand/:brandSlug',
    loadComponent: () =>
      import('../products/pages/products-by-brand/products-by-brand.component').then(
        (m) => m.ProductsByBrandComponent
      ),
  },
  {
    path: ':productId',
    loadComponent: () =>
      import('../product/page/product-page/product-page.component').then(
        (m) => m.ProductPageComponent
      ),
  },
];