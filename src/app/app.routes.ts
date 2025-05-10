import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '',
    pathMatch: 'full'
  },
  {
    path: '',
    loadComponent: () =>
      import('./features/home/page/home-page/home-page.component').then(
        (m) => m.HomePageComponent
      ),
    data: { animation: '' },
    pathMatch: 'full',
  },
  {
    path: 'user',
    loadChildren: () => import('./features/auth/auth.route').then(m => m.authroutes),
    data: { animation: 'user' }
  },
  {
    path: 'order-received/:orderId',
    loadComponent: () =>
      import('./features/order/page/order-page/order-page.component').then(
        (m) => m.OrderPageComponent
      ),
    data: { animation: 'order' },
    pathMatch: 'full',
  },
  {
    path: 'cart',
    loadComponent: () =>
      import('./features/cart/page/cart-page/cart-page.component').then(
        (m) => m.CartPageComponent
      ),
    data: { animation: 'cart' },
    pathMatch: 'full',
  },
  {
    path: 'checkout',
    loadComponent: () =>
      import('./features/checkout/page/checkout-page/checkout-page.component').then(
        (m) => m.CheckoutPageComponent
      ),
    data: { animation: 'checkout' },
    pathMatch: 'full',
  },
  {
    path: 'blog',
    loadChildren: () => import('./features/blog/blog.routes').then(m => m.blogRoutes),
    data: { animation: 'blog' }
  },
  {
    path: 'product',
    loadChildren: () => import('./features/products/products.routes').then(m => m.productsRoutes),
    data: { animation: 'product' }
  },
  {
    path: 'pages',
    loadChildren: () => import('./features/terms,about,contactUs/pages.routes').then(m => m.pagesRoutes),
    data: { animation: 'pages' }
  },
  {
    path: 'category',
    loadChildren: () => import('./features/products/categories.routes').then(m => m.categoryRoutes),
    data: { animation: 'category' }
  },
  {
    path: 'history',
    loadComponent: () =>
      import('./features/products/pages/History-page/history-page.component').then(
        (m) => m.HistoryPageComponent
      ),
    data: { animation: 'history' },
    title: 'Browsing History',
  },
  {
    path: 'page-not-found',
    loadComponent: () =>
      import('./features/not-found/not-found-page.component').then(
        (m) => m.NotFoundPageComponent
      ),
    data: { animation: 'notFound' },
    title: '404 - Not Found',
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found-page.component').then(
        (m) => m.NotFoundPageComponent
      ),
    data: { animation: 'notFound' },
    pathMatch: 'full',
  },
];
