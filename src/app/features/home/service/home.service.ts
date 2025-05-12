import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, catchError, of, shareReplay } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { CacheService } from '../../../core/services/cashing.service';
import { environment } from '../../../../environments/environment';

interface BannerImage {
  large: string;
  small: string;
}

@Injectable({ providedIn: 'root' })
export class HomeService {
  constructor(
    private wooApi: ApiService,
    private cachingService: CacheService,
    private http: HttpClient
  ) {}

  getNewArrivalsProducts(page: number = 1, perPage: number = 30): any {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const afterDate = thirtyDaysAgo.toISOString();

    return this.wooApi
      .getRequestProducts<any>('products', {
        params: new HttpParams()
          .set('after', afterDate)
          .set(
            '_fields',
            'id,name,price,images,categories,description,slug,sale_price,regular_price,on_sale,variations,currency,attributes,quantity_limits,tags,meta_data,stock_status,stock_quantity,date_created,status,type'
          )
          .set('page', page.toString())
          .set('per_page', perPage.toString())
          .set('stock_status', 'instock')
          .set('orderby', 'date')
          .set('order', 'desc'),
        observe: 'response',
      })
      .pipe(
        map((response: HttpResponse<any>) => {
          const products = response.body.map((product: any) => ({
            ...product,
            images: product.images.slice(0, 3) || [],
          }));
          return products
                }),
        catchError((error) => {
          console.error('Error fetching products:', error);
          return of([]);
        }),
        shareReplay(1)
      );
  }

  getFeaturedProducts(page: number = 1, perPage: number = 30): any {
    return this.wooApi
      .getRequestProducts<any>('products', {
        params: new HttpParams()
          .set('featured', true)
          .set(
            '_fields',
            'default_attributes,id,name,price,images,categories,description,slug,attributes,quantity_limits,yoast_head,yoast_head_json,quantity_limits,tags,meta_data,stock_status,stock_quantity,date_created,status,type'
          )
          .set('page', page.toString())
          .set('per_page', perPage.toString())
          .set('stock_status', 'instock')
          .set('orderby', 'date')
          .set('order', 'desc'),
        observe: 'response',
      })
      .pipe(
        map((response: HttpResponse<any>) => {
          const products = response.body.map((product: any) => ({
            ...product,
            images: product.images.slice(0, 3) || [],
          }));
          return products
        
        }),
        catchError((error) => {
          console.error('Error fetching products:', error);
          return of([]);
        }),
        shareReplay(1)
      );
  }

  getSaleProducts(page: number = 1, perPage: number = 30): any {
    return this.wooApi
      .getRequestProducts<any>('products', {
        params: new HttpParams()
          .set('on_sale', true)
          .set(
            '_fields',
            'id,name,price,images,categories,description,slug,sale_price,regular_price,on_sale,variations,currency,attributes,quantity_limits,tags,meta_data,stock_status,stock_quantity,date_created,status,type'
          )
          .set('page', page.toString())
          .set('per_page', perPage.toString())
          .set('stock_status', 'instock')
          .set('orderby', 'date')
          .set('order', 'desc'),
        observe: 'response',
      })
      .pipe(
        map((response: HttpResponse<any>) => {
          const products = response.body.map((product: any) => ({
            ...product,
            images: product.images.slice(0, 3) || [],
          }));
          return response.body;
        }),
        catchError((error) => {
          console.error('Error fetching products:', error);
          return of([]);
        }),
        shareReplay(1)
      );
  }

  getCategories(parent: number = 0, perPage: number = 10): Observable<any> {
    return this.wooApi
      .getRequestProducts<any>('products/categories', {
        params: new HttpParams()
          .set('parent', parent.toString())
          .set('per_page', perPage.toString())
          .set('_fields', 'id,name,slug,image,count'),
        observe: 'response',
      })
      .pipe(
        map((response: HttpResponse<any>) => {
          return response.body;
        }),
        catchError((error) => {
          console.error('Error fetching categories:', error);
          return of([]);
        }),
        shareReplay(1)
      );
  }

  getBrandsByIds(brandIds: number[], perPage: number = 20): Observable<any> {
    const cacheKey = `brands_${brandIds.join('_')}`;
    const cachedData = this.cachingService.get(cacheKey);
    if (cachedData) {
      return of(cachedData);
    }

    return this.wooApi
      .getRequestProducts<any>('products/attributes/3/terms', {
        params: new HttpParams()
          .set('per_page', perPage.toString())
          .set('_fields', 'id,name,slug,count,image'),
        observe: 'response',
      })
      .pipe(
        map((response: HttpResponse<any>) => {
          const filteredBrands = response.body
            .filter((brand: any) => brandIds.includes(brand.id))
            .map((brand: any) => ({
              id: brand.id,
              name: brand.name,
              slug: brand.slug,
              count: brand.count,
              image: brand.image || undefined,
            }));
          this.cachingService.set(cacheKey, filteredBrands);
          return filteredBrands;
        }),
        catchError((error) => {
          console.error('Error fetching brands:', error);
          return of([]);
        }),
        shareReplay(1)
      );
  }

  getBrandById(termId: number): Observable<any> {
    const cacheKey = `brand_${termId}`;
    const cachedData = this.cachingService.get(cacheKey);
    if (cachedData) {
      return of(cachedData);
    }

    return this.wooApi
      .getRequestProducts<any>(`products/attributes/3/terms/${termId}`, {
        params: new HttpParams().set('_fields', 'id,name,slug,count,image'),
        observe: 'response',
      })
      .pipe(
        map((response: HttpResponse<any>) => {
          const brand = response.body;
          const formattedBrand = {
            id: brand.id,
            name: brand.name,
            slug: brand.slug,
            count: brand.count,
            image: brand.image || undefined,
          };
          this.cachingService.set(cacheKey, formattedBrand);
          return formattedBrand;
        }),
        catchError((error) => {
          console.error(`Error fetching brand with ID ${termId}:`, error);
          return of(null);
        }),
        shareReplay(1)
      );
  }

  getBannerImages(): Observable<BannerImage[]> {
    const cacheKey = 'banner_images';
    const cachedData = this.cachingService.get(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }
    
    // Use the API service for the external request
    const url = 'https://adventures-hub.com/wp-json/custom/v1/banners';
    
    return this.http.get<{banner_images: BannerImage[]}>(url)
      .pipe(
        map(response => {
          // Validate response structure
          if (response && response.banner_images && Array.isArray(response.banner_images)) {
            // Validate each banner image has required properties
            const validBannerImages = response.banner_images.filter((banner: any) => 
              banner && typeof banner === 'object' && 
              typeof banner.large === 'string' && 
              typeof banner.small === 'string'
            );
            
            this.cachingService.set(cacheKey, validBannerImages, 3600); // Cache for 1 hour
            return validBannerImages;
          } else if (response && Array.isArray(response)) {
            // Handle case where response is an array directly
            const validBannerImages = response.filter((banner: any) => 
              banner && typeof banner === 'object' && 
              typeof banner.large === 'string' && 
              typeof banner.small === 'string'
            );
            
            this.cachingService.set(cacheKey, validBannerImages, 3600);
            return validBannerImages;
          }
          return [];
        }),
        catchError(error => {
          console.error('Error fetching banner images:', error);
          return of([]);
        }),
        shareReplay(1)
      );
  }
}