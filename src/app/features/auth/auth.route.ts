import { Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';

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
    canActivate: [AuthGuard], 
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./account-details/components/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./account-details/components/orders/orders.component').then(
            (m) => m.OrdersComponent
          ),
      },
      {
        path: 'downloads',
        loadComponent: () =>
          import('./account-details/components/downloads/downloads.component').then(
            (m) => m.DownloadsComponent
          ),
      },
      {
        path: 'addresses',
        loadComponent: () =>
          import('./account-details/components/addresses/addresses.component').then(
            (m) => m.AddressesComponent
          ),
      },
      {
        path: 'payment-methods',
        loadComponent: () =>
          import('./account-details/components/payment-methods/payment-methods.component').then(
            (m) => m.PaymentMethodsComponent
          ),
      },
      {
        path: 'wishlist',
        loadComponent: () =>
          import('./account-details/components/wishlist/wishlist.component').then(
            (m) => m.WishlistComponent
          ),
      },
    ],
  },
  {
    path: '',
    redirectTo: 'myaccount',
    pathMatch: 'full',
  },
];