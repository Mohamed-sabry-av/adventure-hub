import { Routes } from '@angular/router';
import { blogRoutes } from './features/blog/blog.routes';
import { productsRoutes } from './features/products/products.routes';
import { pagesRoutes } from './features/terms,about,contactUs/pages.routes';
import { categoryRoutes } from './features/products/categories.routes';
import { authroutes } from './features/auth/auth.route';

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
    path: 'order-received',
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
    path: 'user',
    children: authroutes,
  },
  {
    path: 'blog',
    children: blogRoutes, 
  },
  {
    path: 'product',
    children: productsRoutes, 
  },
  {
    path: 'pages',
    children: pagesRoutes, 
  },
  {
    path: 'category',
    children: categoryRoutes, 
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  },
];