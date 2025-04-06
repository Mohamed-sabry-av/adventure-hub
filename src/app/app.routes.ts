import { Routes } from '@angular/router';
import { BlogSectionPageComponent } from './features/blog/page/blog-section-page/blog-section-page.component';
import { blogSectionGuard } from './features/blog/guards/blog-section.guard';
import { HomePageComponent } from './features/home/page/home-page/home-page.component';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/page/home-page/home-page.component').then(
        (m) => m.HomePageComponent
      ),
    pathMatch: 'full',
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
    loadComponent: () =>
      import(
        './features/checkout/page/checkout-page/checkout-page.component'
      ).then((m) => m.CheckoutPageComponent),
  },
  {
    path: 'myaccount',
    loadComponent: () =>
      import('./features/auth/auth.component').then((m) => m.AuthComponent),
    pathMatch: 'full',
  },
  {
    path: 'blog',
    loadComponent: () =>
      import('./features/blog/page/blog-page/blog-page.component').then(
        (m) => m.BlogPageComponent
      ),
    pathMatch: 'full',
  },
  {
    path: ':articleName',
    loadComponent: () =>
      import(
        './features/blog/page/blog-section-page/blog-section-page.component'
      ).then((m) => m.BlogSectionPageComponent),
    pathMatch: 'full',
    canMatch: [blogSectionGuard],
    data: {},
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
];
