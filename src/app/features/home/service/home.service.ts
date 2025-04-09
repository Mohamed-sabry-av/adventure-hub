import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  Observable,
  map,
  catchError,
  of,
  shareReplay,
  BehaviorSubject,
} from 'rxjs';
import { Product } from '../../../interfaces/product';
import { ApiService } from '../../../core/services/api.service';
import { CacheService } from '../../../core/services/cashing.service';

@Injectable({ providedIn: 'root' })
export class HomeService {
  constructor(
    private wooApi: ApiService,
    private cachingService: CacheService
  ) {}

  getNewArrivalsProducts(page: number = 1, perPage: number = 20): any {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const afterDate = thirtyDaysAgo.toISOString();

    return this.wooApi
      .getRequestProducts<any>('products', {
        params: new HttpParams()
          .set('after', afterDate)
          .set('_fields', 'images,permalink,id,price,name')
          .set('page', page.toString())
          .set('per_page', perPage.toString())
          .set('stock_status', 'instock')
          .set('orderby', 'date')
          .set('order', 'desc'),
        observe: 'response',
      })
      .pipe(
        map((response: HttpResponse<any>) => {
          return response.body;
        }),
        catchError((error) => {
          console.error('Error fetching products :', error);
          return of([]);
        }),
        shareReplay(1)
      );
  }

  getFeaturedProducts(page: number = 1, perPage: number = 20): any {
    return this.wooApi
      .getRequestProducts<any>('products', {
        params: new HttpParams()
          .set('featured', true)
          .set('_fields', 'images,permalink,id,price,name')
          .set('page', page.toString())
          .set('per_page', perPage.toString())
          .set('stock_status', 'instock')
          .set('orderby', 'date')
          .set('order', 'desc'),
        observe: 'response',
      })
      .pipe(
        map((response: HttpResponse<any>) => {
          return response.body;
        }),
        catchError((error) => {
          console.error('Error fetching products :', error);
          return of([]);
        }),
        shareReplay(1)
      );
  }

  getSaleProducts(page: number = 1, perPage: number = 20): any {
    return this.wooApi
      .getRequestProducts<any>('products', {
        params: new HttpParams()
          .set('on_sale', true)
          .set('_fields', 'images,permalink,id,price,name,regular_price')
          .set('page', page.toString())
          .set('per_page', perPage.toString())
          .set('stock_status', 'instock')
          .set('orderby', 'date')
          .set('order', 'desc'),
        observe: 'response',
      })
      .pipe(
        map((response: HttpResponse<any>) => {
          return response.body;
        }),
        catchError((error) => {
          console.error('Error fetching products :', error);
          return of([]);
        }),
        shareReplay(1)
      );
  }
}

/*
          const featuredProducts = response.body.filter(
            (product: any) => product.featured
          );
          const saleProducts = response.body.filter(
            (product: any) => product.on_Sale === 'true'
          );

          // console.log('Arrivals', newArrivalsProducts);
          // console.log('Featured', featuredProducts);
          // console.log('Sale', saleProducts);
*/
