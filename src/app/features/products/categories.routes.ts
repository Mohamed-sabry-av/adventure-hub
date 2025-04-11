import { Routes } from '@angular/router';

export const categoryRoutes: Routes = [
    {
        path: ':mainCategorySlug/:subCategorySlug/:subSubCategorySlug/:subSubSubCategorySlug/:subSubSubSubCategorySlug',
        loadComponent: () =>
          import('../products/pages/Products/products.component').then(
            (m) => m.ProductsComponent
          ),
        pathMatch: 'full',
        data: { breadcrumb: 'Sub-Sub-Sub-Sub Category' },
      },
      {
        path: ':mainCategorySlug/:subCategorySlug/:subSubCategorySlug/:subSubSubCategorySlug',
        loadComponent: () =>
          import('../products/pages/Products/products.component').then(
            (m) => m.ProductsComponent
          ),
        pathMatch: 'full',
        data: { breadcrumb: 'Sub-Sub-Sub Category' },
      },
      {
        path: ':mainCategorySlug/:subCategorySlug/:subSubCategorySlug',
        loadComponent: () =>
          import('../products/pages/Products/products.component').then(
            (m) => m.ProductsComponent
          ),
        pathMatch: 'full',
        data: { breadcrumb: 'Sub-Sub Category' },
      },
      {
        path: ':mainCategorySlug/:subCategorySlug',
        loadComponent: () =>
          import('../products/pages/Products/products.component').then(
            (m) => m.ProductsComponent
          ),
        pathMatch: 'full',
        data: { breadcrumb: 'Sub Category' },
      },
      {
        path: ':mainCategorySlug',
        loadComponent: () =>
          import('../products/pages/Products/products.component').then(
            (m) => m.ProductsComponent
          ),
        pathMatch: 'full',
        data: { breadcrumb: 'Main Category' },
      },
];