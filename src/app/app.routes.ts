import { Routes } from '@angular/router';
import { BlogSectionPageComponent } from './features/blog/page/blog-section-page/blog-section-page.component';
import { blogSectionGuard } from './features/blog/guards/blog-section.guard';

export const routes: Routes = [
  // المسارات الثابتة
  {
    path: '',
    loadComponent: () =>
      import('./features/Home/home.component').then((m) => m.HomeComponent),
    pathMatch: 'full',
  },
  {
    path: 'cart',
    loadComponent: () =>
      import('./features/cart/page/cart-page/cart-page.component').then(
        (m) => m.CartPageComponent
      ),
    pathMatch: 'full',
  },
  {
    path: 'checkout',
    loadComponent: () =>
      import('./features/checkout/page/checkout-page/checkout-page.component').then(
        (m) => m.CheckoutPageComponent
      ),
    pathMatch: 'full',
  },
  {
    path: 'myaccount',
    loadComponent: () =>
      import('./features/auth/auth.component').then((m) => m.AuthComponent),
    pathMatch: 'full',
  },
  {
    path: 'sale',
    loadComponent: () =>
      import(
        './features/products/pages/products-by-sale/products-by-sale.component'
      ).then((m) => m.ProductsBySaleComponent),
    pathMatch: 'full',
    data: { breadcrumb: 'sale' },
  },
  {
    path: 'blog',
    loadComponent: () =>
      import('./features/blog/page/blog-page/blog-page.component').then(
        (m) => m.BlogPageComponent
      ),
    pathMatch: 'full',
  },

  // Nested Route للـ Pages
  {
    path: 'pages',
    children: [
      {
        path: 'terms', // الـ URL هيبقى /pages/terms
        loadComponent: () =>
          import('./features/terms,about,contactUs/page/terms/terms.component').then(
            (m) => m.TermsComponent
          ),
      },
      {
        path: 'about-us',
        loadComponent: () =>
          import('./features/terms,about,contactUs/page/AboutUs/about-us.component').then((m) => m.AboutUsComponent),
      },
      
    ],
  },

  // المسارات الديناميكية
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
    path: ':mainCategorySlug/:subCategorySlug/:subSubCategorySlug/:subSubSubCategorySlug/:subSubSubSubCategorySlug',
    loadComponent: () =>
      import('./features/products/pages/Products/products.component').then(
        (m) => m.ProductsComponent
      ),
    pathMatch: 'full',
    data: { breadcrumb: 'Sub-Sub-Sub-Sub Category' },
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
    path: ':mainCategorySlug/:subCategorySlug/:subSubCategorySlug',
    loadComponent: () =>
      import('./features/products/pages/Products/products.component').then(
        (m) => m.ProductsComponent
      ),
    pathMatch: 'full',
    data: { breadcrumb: 'Sub-Sub Category' },
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
    path: ':mainCategorySlug',
    loadComponent: () =>
      import('./features/products/pages/Products/products.component').then(
        (m) => m.ProductsComponent
      ),
    pathMatch: 'full',
    data: { breadcrumb: 'Main Category' },
  },

  // Wildcard Route
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  },
];