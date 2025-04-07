import { Routes } from '@angular/router';
import { BlogSectionPageComponent } from './features/blog/page/blog-section-page/blog-section-page.component';
import { blogSectionGuard } from './features/blog/guards/blog-section.guard';
import { blogRoutes } from './features/blog/blog.routes';
import { productsRoutes } from './features/products/products.routes';
import { pagesRoutes } from './features/terms,about,contactUs/pages.routes';
import { categoryRoutes } from './features/products/categories.routes';

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

  // Nested Routes 
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
  // Wildcard Route
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  },
];