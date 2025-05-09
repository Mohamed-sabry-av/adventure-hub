import { Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';

export const authroutes: Routes = [
  {
    path: 'myaccount',
    loadComponent: () =>
      import('./auth.component').then((m) => m.AuthComponent),
    data: { authRequired: false, animation: 'authLogin' }
  },
  {
    path: 'Useraccount',
    loadComponent: () =>
      import('./account-details/account-details.component').then(
        (m) => m.AccountDetailsComponent
      ),
    canActivate: [AuthGuard],
    data: { authRequired: true, animation: 'userAccount' },
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./account-details/components/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
        data: { animation: 'userDashboard' }
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./account-details/components/orders/orders.component').then(
            (m) => m.OrdersComponent
          ),
        data: { animation: 'userOrders' }
      },
      {
        path: 'orders/:id',
        loadComponent: () =>
          import('./account-details/components/orders/orders.component').then(
            (m) => m.OrdersComponent
          ),
        data: { animation: 'userOrder' }
      },
      {
        path: 'downloads',
        loadComponent: () =>
          import('./account-details/components/downloads/downloads.component').then(
            (m) => m.DownloadsComponent
          ),
        data: { animation: 'userDownloads' }
      },
      {
        path: 'addresses',
        loadComponent: () =>
          import('./account-details/components/addresses/addresses.component').then(
            (m) => m.AddressesComponent
          ),
        data: { animation: 'userAddresses' }
      },
      {
        path: 'payment-methods',
        loadComponent: () =>
          import('./account-details/components/payment-methods/payment-methods.component').then(
            (m) => m.PaymentMethodsComponent
          ),
        data: { animation: 'userPayment' }
      },
      {
        path: 'wishlist',
        loadComponent: () =>
          import('./account-details/components/wishlist/wishlist.component').then(
            (m) => m.WishlistComponent
          ),
        data: { animation: 'userWishlist' }
      },
    ],
  },
  {
    path: 'wishlist',
    loadComponent: () =>
      import('./account-details/components/local-wishlist/local-wishlist.component').then(
        (m) => m.LocalWishlistComponent
      ),
    data: { authRequired: false, animation: 'localWishlist' }
  },
  {
    path: '',
    redirectTo: 'myaccount',
    pathMatch: 'full',
  },
  {
    path: '**', // معالجة المسارات غير الموجودة
    redirectTo: 'myaccount',
  },
];
