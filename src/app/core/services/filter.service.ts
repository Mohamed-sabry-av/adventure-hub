import { HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, of, shareReplay, switchMap, debounceTime, forkJoin } from 'rxjs';
import { ApiService } from './api.service';
import { ProductService } from './product.service';
import { Product } from '../../interfaces/product';
import { HandleErrorsService } from './handel-errors.service';
import { CacheService } from './cashing.service';

@Injectable({
  providedIn: 'root',
})
export class FilterService {
  constructor(
    private WooAPI: ApiService,
    private handleErrorsService: HandleErrorsService,
    private cachingService: CacheService,
    private productsService: ProductService
  ) {}

  getProductAttributes(): Observable<any[]> {
    return this.WooAPI.getRequestProducts<any>('products/attributes', {
      params: new HttpParams(),
    }).pipe(
      map((response) => response),
      catchError((error) => this.handleErrorsService.handelError(error))
    );
  }

  getAttributeTerms(attributeId: number): Observable<any[]> {
    return this.WooAPI.getRequestProducts<any>(`products/attributes/${attributeId}/terms`, {
      params: new HttpParams().set('per_page', '100'),
    }).pipe(
      map((response) => response),
      catchError((error) => {
        console.error(`Error fetching terms for attribute ${attributeId}:`, error);
        return of([]);
      })
    );
  }

  getAttributesAndTermsByCategory(
    categoryId: number,
    page: number = 1,
    perPage: number = 100
  ): Observable<{ terms: { [key: string]: string[] }, totalPages: number }> {
    const cacheKey = `attributes_terms_category_${categoryId}_page_${page}`;
    return this.cachingService.cacheObservable(
      cacheKey,
      this.WooAPI.getRequestProducts<any>('products', {
        params: new HttpParams()
          .set('category', categoryId.toString())
          .set('_fields', 'id,attributes')
          .set('per_page', perPage.toString())
          .set('page', page.toString()),
        observe: 'response',
      }).pipe(
        map((response: HttpResponse<any>) => {
          const products = response.body;
          const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1', 10);
          const termsMap = new Map<string, Set<string>>();
          products.forEach((product: any) => {
            product.attributes.forEach((attr: any) => {
              const attrKey = attr.slug || attr.name;
              if (!termsMap.has(attrKey)) {
                termsMap.set(attrKey, new Set());
              }
              if (attr.options) {
                attr.options.forEach((option: string) => termsMap.get(attrKey)!.add(option.trim().toLowerCase()));
              }
            });
          });
          return {
            terms: Object.fromEntries(
              Array.from(termsMap.entries()).map(([key, terms]) => [key, Array.from(terms)])
            ),
            totalPages,
          };
        }),
        catchError((error) => {
          console.error(`Error fetching attributes/terms for category ${categoryId}:`, error);
          return of({ terms: {}, totalPages: 1 });
        }),
        shareReplay(1)
      ),
      300000
    );
  }

  getAllAttributesAndTermsByCategory(categoryId: number): Observable<{ [key: string]: string[] }> {
    return this.getAttributesAndTermsByCategory(categoryId, 1, 100).pipe(
      switchMap((firstResponse) => {
        const totalPages = firstResponse.totalPages;
        if (totalPages <= 1) {
          return of(firstResponse.terms);
        }
        const requests = Array.from({ length: totalPages - 1 }, (_, i) =>
          this.getAttributesAndTermsByCategory(categoryId, i + 2, 100)
        );
        return forkJoin(requests).pipe(
          map((responses) => {
            const allTerms = { ...firstResponse.terms };
            responses.forEach((res) => {
              Object.entries(res.terms).forEach(([key, terms]) => {
                allTerms[key] = [...(allTerms[key] || []), ...terms];
              });
            });
            return allTerms;
          })
        );
      })
    );
  }

  getFilteredProductsByCategory(
    categoryId: number | null,
    filters: { [key: string]: string[] },
    page: number = 1,
    perPage: number = 18
  ): Observable<Product[]> {
    const cacheKey = `filtered_products_category_${categoryId || 'all'}_filters_${JSON.stringify(filters)}_page_${page}`;
    return this.cachingService.cacheObservable(
      cacheKey,
      this.WooAPI.getRequestProducts<any>('products', {
        params: this.buildFilterParams(categoryId, filters, page, perPage),
        observe: 'response',
      }).pipe(
        debounceTime(300),
        map((response: HttpResponse<any>) => {
          const products = this.productsService.getUniqueProducts(
            response.body.map((product: any) => ({
              ...product,
              images: product.images.slice(0, 3) || [],
            }))
          );
          return products;
        }),
        catchError((error) => {
          console.error('Error fetching filtered products:', error);
          return of([]);
        }),
        shareReplay(1)
      ),
      300000
    );
  }

  private buildFilterParams(
    categoryId: number | null,
    filters: { [key: string]: string[] },
    page: number,
    perPage: number
  ): HttpParams {
    let params = new HttpParams()
      .set('per_page', perPage.toString())
      .set('page', page.toString())
      .set('_fields', 'id,name,price,images,categories,description,sale_price,regular_price,on_sale,variations,currency');

    if (categoryId) {
      params = params.set('category', categoryId.toString());
    }

    Object.entries(filters).forEach(([attrSlug, terms]) => {
      if (terms.length > 0) {
        params = params.set('attribute', attrSlug);
        params = params.set('attribute_term', terms.join(','));
      }
    });

    return params;
  }

  getAllAttributeTerms(attributeId: number): Observable<any[]> {
    const cacheKey = `all_attribute_terms_${attributeId}`;
    return this.cachingService.cacheObservable(
      cacheKey,
      (() => {
        const allTerms: any[] = [];
        let page = 1;
        const perPage = 100;

        const fetchPage = (currentPage: number): Observable<any> =>
          this.WooAPI.getRequestProducts<any>(`products/attributes/${attributeId}/terms`, {
            params: new HttpParams()
              .set('per_page', perPage.toString())
              .set('page', currentPage.toString()),
            observe: 'response',
          }).pipe(
            switchMap((response) => {
              const terms = response.body || [];
              allTerms.push(...terms);
              const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1', 10);
              if (currentPage < totalPages) {
                return fetchPage(currentPage + 1);
              } else {
                return of(allTerms);
              }
            }),
            catchError((error) => {
              console.error(`Error fetching terms for attribute ${attributeId}:`, error);
              return of(allTerms);
            })
          );

        return fetchPage(page);
      })(),
      3600000
    );
  }
}