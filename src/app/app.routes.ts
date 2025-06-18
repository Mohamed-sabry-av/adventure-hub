import { Routes } from '@angular/router';
import { maintenanceGuard } from './core/guards/maintenance.guard';

export const routes: Routes = [
  {
    path: 'maintenance',
    loadComponent: () =>
      import('./features/maintenance/maintenance-page.component').then(
        (m) => m.MaintenancePageComponent
      ),
    data: { animation: 'maintenance' },
    pathMatch: 'full',
  },
  {
    path: 'admin/maintenance-config',
    loadComponent: () =>
      import('./features/maintenance/maintenance-config.component').then(
        (m) => m.MaintenanceConfigComponent
      ),
    data: { animation: 'maintenance-config' },
    pathMatch: 'full',
  },
  {
    path: '',
    loadComponent: () =>
      import('./features/home/page/home-page/home-page.component').then(
        (m) => m.HomePageComponent
      ),
    data: { animation: '' },
    pathMatch: 'full',
    canActivate: [maintenanceGuard]
  },
  {
    path: 'user',
    loadChildren: () => import('./features/auth/auth.route').then(m => m.authroutes),
    data: { animation: 'user' },
    canActivate: [maintenanceGuard]
  },
  {
    path: 'order-received/:orderId',
    loadComponent: () =>
      import('./features/order/page/order-page/order-page.component').then(
        (m) => m.OrderPageComponent
      ),
    data: { animation: 'order' },
    pathMatch: 'full',
    canActivate: [maintenanceGuard]
  },
  {
    path: 'cart',
    loadComponent: () =>
      import('./features/cart/page/cart-page/cart-page.component').then(
        (m) => m.CartPageComponent
      ),
    data: { animation: 'cart' },
    pathMatch: 'full',
    canActivate: [maintenanceGuard]
  },
  {
    path: 'checkout',
    loadComponent: () =>
      import('./features/checkout/page/checkout-page/checkout-page.component').then(
        (m) => m.CheckoutPageComponent
      ),
    data: { animation: 'checkout' },
    pathMatch: 'full',
    canActivate: [maintenanceGuard]
  },
  {
    path: 'blog',
    loadChildren: () => import('./features/blog/blog.routes').then(m => m.blogRoutes),
    data: { animation: 'blog' },
    canActivate: [maintenanceGuard]
  },
  {
    path: 'brand/:brandSlug',
    loadComponent: () =>
      import('./features/products/pages/products-by-brand/products-by-brand.component').then(
        (m) => m.ProductsByBrandComponent
      ),
    data: { animation: 'brand' },
    canActivate: [maintenanceGuard]
  },
  {
    path: 'sale',
    loadComponent: () =>
      import('./features/products/pages/products-by-sale/products-by-sale.component').then(
        (m) => m.ProductsBySaleComponent
      ),
    data: { animation: 'sale' },
    canActivate: [maintenanceGuard]
  },
  // Handle subcategory routes - up to 4 levels deep
  {
    path: ':cat1/:cat2/:cat3/:cat4',
    loadComponent: () =>
      import('./features/products/pages/Products/products.component').then(
        (m) => m.ProductsComponent
      ),
    data: { animation: 'category' },
    canActivate: [maintenanceGuard]
  },
  {
    path: ':cat1/:cat2/:cat3',
    loadComponent: () =>
      import('./features/products/pages/Products/products.component').then(
        (m) => m.ProductsComponent
      ),
    data: { animation: 'category' },
    canActivate: [maintenanceGuard]
  },
  {
    path: ':cat1/:cat2',
    loadComponent: () =>
      import('./features/products/pages/Products/products.component').then(
        (m) => m.ProductsComponent
      ),
    data: { animation: 'category' },
    canActivate: [maintenanceGuard]
  },
  {
    path: ':slug',
    loadComponent: () =>
      import('./features/dynamic-content/dynamic-content.component').then(
        (m) => m.DynamicContentComponent
      ),
    data: { animation: 'dynamic' },
    canActivate: [maintenanceGuard]
  },
  {
    path: 'pages',
    loadChildren: () => import('./features/terms,about,contactUs/pages.routes').then(m => m.pagesRoutes),
    data: { animation: 'pages' },
    canActivate: [maintenanceGuard]
  },
  {
    path: 'history',
    loadComponent: () =>
      import('./features/products/pages/History-page/history-page.component').then(
        (m) => m.HistoryPageComponent
      ),
    data: { animation: 'history' },
    title: 'Browsing History',
    canActivate: [maintenanceGuard]
  },
  {
    path: 'page-not-found',
    loadComponent: () =>
      import('./features/not-found/not-found-page.component').then(
        (m) => m.NotFoundPageComponent
      ),
    data: { animation: 'notFound' },
    title: '404 - Not Found',
    canActivate: [maintenanceGuard]
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found-page.component').then(
        (m) => m.NotFoundPageComponent
      ),
    data: { animation: 'notFound' },
    pathMatch: 'full',
    canActivate: [maintenanceGuard]
  },
];
