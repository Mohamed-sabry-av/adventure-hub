import { Routes } from '@angular/router';
import { HomeComponent } from './features/Home/home.component';
import { ProductsComponent } from './features/products/products.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'products', component: ProductsComponent },
];
