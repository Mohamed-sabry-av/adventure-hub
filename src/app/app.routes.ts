import { Routes } from '@angular/router';

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
    path: 'user',
    loadChildren: () => import('./features/auth/auth.route').then(m => m.authroutes),
  },
  {
    path: 'order-received/:orderId',
    loadComponent: () =>
      import('./features/order/page/order-page/order-page.component').then(
        (m) => m.OrderPageComponent
      ),
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
    path: 'blog',
    loadChildren: () => import('./features/blog/blog.routes').then(m => m.blogRoutes),
  },
  {
    path: 'product',
    loadChildren: () => import('./features/products/products.routes').then(m => m.productsRoutes),
  },
  {
    path: 'pages',
    loadChildren: () => import('./features/terms,about,contactUs/pages.routes').then(m => m.pagesRoutes),
  },
  {
    path: 'category',
    loadChildren: () => import('./features/products/categories.routes').then(m => m.categoryRoutes),
  },
  {
    path: 'history',
    loadComponent: () =>
      import('./features/products/pages/History-page/history-page.component').then(
        (m) => m.HistoryPageComponent
      ),
    title: 'Browsing History',
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  },
];