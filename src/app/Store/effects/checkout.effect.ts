import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { StoreInterface } from '../store';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { createOrderAction } from '../actions/checkout.action';
import { catchError, map, switchMap } from 'rxjs';

export class CheckoutEffect {
  private actions$ = inject(Actions);
  private store = inject(Store<StoreInterface>);
  private httpClient = inject(HttpClient);

  checkoutEffect = createEffect(
    () =>
      this.actions$.pipe(
        ofType(createOrderAction),
        switchMap(({ orderDetails }) => {
          console.log(orderDetails);
          let authToken: any = localStorage.getItem('auth_token');
          authToken = authToken ? JSON.parse(authToken) : '';

          const headers = new HttpHeaders({
            Authorization: `Bearer ${authToken.value}`,
          });

          return this.httpClient
            .post(
              'https://adventures-hub.com/wp-json/wc/v3/orders',
              orderDetails,
              {
                headers,
              }
            )
            .pipe(
              map((res) => console.log('success : ', res)),
              catchError((error: any) => {
                console.log('errr : ', error);
                return '';
              })
            );
        })
      ),
    { dispatch: false }
  );
}
