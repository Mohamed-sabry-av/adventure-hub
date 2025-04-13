import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { StoreInterface } from '../store';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { createOrderAction } from '../actions/checkout.action';
import { catchError, map, of, switchMap } from 'rxjs';

export class CheckoutEffect {
  private actions$ = inject(Actions);
  private store = inject(Store<StoreInterface>);
  private httpClient = inject(HttpClient);

  checkoutEffect = createEffect(
    () =>
      this.actions$.pipe(
        ofType(createOrderAction),
        switchMap(({ orderDetails }) => {
          console.log('Order Details:', orderDetails);
          let authToken: any = localStorage.getItem('auth_token');
          authToken = authToken ? JSON.parse(authToken) : '';

          const headers = new HttpHeaders({
            Authorization: `Bearer ${authToken.value}`,
          });

          return this.httpClient
            .post('http://46.202.88.235/wp-json/wc/v3/orders', orderDetails, {
              headers,
            })
            .pipe(
              map((res) => {
                console.log('Success:', res);
                alert('تم إنشاء الطلب بنجاح!');
                return res; // ممكن ترجع حاجة لو عايز
              }),
              catchError((error: any) => {
                console.error('Error:', error);
                alert('حدث خطأ أثناء إنشاء الطلب: ' + error.message);
                return of(''); // نرجع Observable فاضي عشان الصمت
              })
            );
        })
      ),
    { dispatch: false }
  );
}
