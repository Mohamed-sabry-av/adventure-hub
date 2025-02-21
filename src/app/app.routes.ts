import { Routes } from '@angular/router';
import { HomeComponent } from './features/Home/home.component';
import { ProductsComponent } from './features/products/products.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    pathMatch: 'full',
  },
  {
    path: ':mainCategorySlug',
    component: ProductsComponent,
    pathMatch: 'full',
  },
  {
    path: ':mainCategorySlug/:subCategorySlug',
    component: ProductsComponent,
    pathMatch: 'full',
  },
  {
    path: ':mainCategorySlug/:subCategorySlug/:subSubCategorySlug',
    component: ProductsComponent,
    pathMatch: 'full',
  },
];
