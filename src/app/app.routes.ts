import { Routes } from '@angular/router';
import { HomeComponent } from './features/Home/home.component';
import { ProductPageComponent } from './features/product/page/product-page/product-page.component';
import { CartPageComponent } from './features/cart/page/cart-page/cart-page.component';
import { CheckoutPageComponent } from './features/checkout/page/checkout-page/checkout-page.component';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/Home/home.component').then((m) => m.HomeComponent),
    pathMatch: 'full',
  },
  {
    path: 'myaccount',
    loadComponent: () =>
      import('./features/auth/auth.component').then((m) => m.AuthComponent),
    pathMatch: 'full',
  },
  {
    path: 'product/:productId',
    loadComponent: () =>
      import(
        './features/product/page/product-page/product-page.component'
      ).then((m) => m.ProductPageComponent),
    pathMatch: 'full',
  },
  {
    path: 'brand/:brandSlug',
    loadComponent: () =>
      import(
        './features/products/pages/products-by-brand/products-by-brand.component'
      ).then((m) => m.ProductsByBrandComponent),
      pathMatch: 'full',
  },
  {
    path: ':mainCategorySlug',
    loadComponent: () =>
      import('./features/products/pages/Products/products.component').then(
        (m) => m.ProductsComponent
      ),
    pathMatch: 'full',
    data: { breadcrumb: 'Main Category' },
  },
  {
    path: ':mainCategorySlug/:subCategorySlug',
    loadComponent: () =>
      import('./features/products/pages/Products/products.component').then(
        (m) => m.ProductsComponent
      ),
    pathMatch: 'full',
    data: { breadcrumb: 'Sub Category' },
  },
  {
    path: ':mainCategorySlug/:subCategorySlug/:subSubCategorySlug',
    loadComponent: () =>
      import('./features/products/pages/Products/products.component').then(
        (m) => m.ProductsComponent
      ),
    pathMatch: 'full',
    data: { breadcrumb: 'Sub-Sub Category' },
  },
  {
    path: ':mainCategorySlug/:subCategorySlug/:subSubCategorySlug/:subSubSubCategorySlug',
    loadComponent: () =>
      import('./features/products/pages/Products/products.component').then(
        (m) => m.ProductsComponent
      ),
    pathMatch: 'full',
    data: { breadcrumb: 'Sub-Sub-Sub Category' },
  },
  {
    path: ':mainCategorySlug/:subCategorySlug/:subSubCategorySlug/:subSubSubCategorySlug/:subSubSubSubCategorySlug',
    loadComponent: () =>
      import('./features/products/pages/Products/products.component').then(
        (m) => m.ProductsComponent
      ),
    pathMatch: 'full',
    data: { breadcrumb: 'Sub-Sub-Sub-Sub Category' },
  },
  {
    path: 'cart',
    loadComponent: () =>
      import('./features/cart/page/cart-page/cart-page.component').then(
        (m) => m.CartPageComponent
      ),
  },
  {
    path: 'checkout',
    component: CheckoutPageComponent,
    pathMatch: 'full',
  },
];
