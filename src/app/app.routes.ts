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
    path: 'product',
    loadChildren: () => import('./features/products/products.routes').then(m => m.productsRoutes),
    data: { animation: 'product' },
    canActivate: [maintenanceGuard]
  },
  {
    path: 'pages',
    loadChildren: () => import('./features/terms,about,contactUs/pages.routes').then(m => m.pagesRoutes),
    data: { animation: 'pages' },
    canActivate: [maintenanceGuard]
  },
  {
    path: 'category',
    loadChildren: () => import('./features/products/categories.routes').then(m => m.categoryRoutes),
    data: { animation: 'category' },
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
