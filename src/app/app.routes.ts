import { Routes } from '@angular/router';
import { HomeComponent } from './features/Home/home.component';
import { ProductsComponent } from './features/products/products.component';
// import { ProductsPageComponent } from './features/products/products-page/products-page.component';
import { ProductPageComponent } from './features/product/page/product-page/product-page.component';
import { CartPageComponent } from './features/cart/page/cart-page/cart-page.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    pathMatch: 'full',
  },

  // {
  //   path: ':mainCategorySlug',
  //   component: ProductsComponent,
  //   pathMatch: 'full',
  //   data: { breadcrumb: 'Main Category' },
  // },
  // {
  //   path: ':mainCategorySlug/:subCategorySlug',
  //   component: ProductsComponent,
  //   pathMatch: 'full',
  //   data: { breadcrumb: 'Sub Category' },
  // },
  // {
  //   path: ':mainCategorySlug/:subCategorySlug/:subSubCategorySlug',
  //   component: ProductsComponent,
  //   pathMatch: 'full',
  //   data: { breadcrumb: 'Sub-Sub Category' },
  // },
  // {
  //   path: ':mainCategorySlug/:subCategorySlug/:subSubCategorySlug/:subSubSubCategorySlug',
  //   component: ProductsComponent,
  //   pathMatch: 'full',
  //   data: { breadcrumb: 'Sub-Sub-Sub Category' },
  // },
  // {
  //   path: ':mainCategorySlug/:subCategorySlug/:subSubCategorySlug/:subSubSubCategorySlug/:subSubSubSubCategorySlug',
  //   component: ProductsComponent,
  //   pathMatch: 'full',
  //   data: { breadcrumb: 'Sub-Sub-Sub-Sub Category' },
  // },

  // --------------------------------------------
  {
    path: 'product/:productId',
    component: ProductPageComponent,
    pathMatch: 'full',
  },

  {
    path: 'cart',
    component: CartPageComponent,
    pathMatch: 'full',
  },
];
