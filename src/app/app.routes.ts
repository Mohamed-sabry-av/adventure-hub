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
    data: { breadcrumb: 'Main Category' } 
  },
  {
    path: ':mainCategorySlug/:subCategorySlug',
    component: ProductsComponent,
    pathMatch: 'full',
    data: { breadcrumb: 'Sub Category' } 

  },
  {
    path: ':mainCategorySlug/:subCategorySlug/:subSubCategorySlug',
    component: ProductsComponent,
    pathMatch: 'full',
    data: { breadcrumb: 'Sub-Sub Category' }

  },
  {
    path: ':mainCategorySlug/:subCategorySlug/:subSubCategorySlug/:subSubSubCategorySlug',
    component: ProductsComponent,
    pathMatch: 'full',
    data: { breadcrumb: 'Sub-Sub-Sub Category' }
  },
  {
    path: ':mainCategorySlug/:subCategorySlug/:subSubCategorySlug/:subSubSubCategorySlug/:subSubSubSubCategorySlug',
    component: ProductsComponent,
    pathMatch: 'full',
    data: { breadcrumb: 'Sub-Sub-Sub-Sub Category' }
  },
];
