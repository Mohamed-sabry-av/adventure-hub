import { Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';
import { OrdersComponent } from './account-details/components/orders/orders.component';
import { DownloadsComponent } from './account-details/components/downloads/downloads.component';
import { AddressesComponent } from './account-details/components/addresses/addresses.component';
import { PaymentMethodsComponent } from './account-details/components/payment-methods/payment-methods.component';
import { AccountDetailsComponent } from './account-details/account-details.component';
import { WishlistComponent } from './account-details/components/wishlist/wishlist.component';
import { DashboardComponent } from './account-details/components/dashboard/dashboard.component';

export const authroutes: Routes = [
  {
    path: 'myaccount',
    loadComponent: () =>
      import('./auth.component').then((m) => m.AuthComponent),
  },
  {
    path: 'Useraccount',
    loadComponent: () =>
      import('./account-details/account-details.component').then(
        (m) => m.AccountDetailsComponent
      ),
    // canActivate: [AuthGuard],
    children: [
      {
        path: '',
        component: DashboardComponent, // Default tab (Dashboard)
      },
      {
        path: 'orders',
        component: OrdersComponent,
      },
      {
        path: 'downloads',
        component: DownloadsComponent,
      },
      {
        path: 'addresses',
        component: AddressesComponent,
      },
      {
        path: 'payment-methods',
        component: PaymentMethodsComponent,
      },
      {
        path: 'wishlist',
        component: WishlistComponent,
      },
    ],
  },
  {
    path: '',
    redirectTo: 'myaccount',
    pathMatch: 'full',
  },
];
