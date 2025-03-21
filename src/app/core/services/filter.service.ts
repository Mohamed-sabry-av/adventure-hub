import { HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, of, shareReplay, switchMap, forkJoin } from 'rxjs';
import { ApiService } from './api.service';
import { Product } from '../../interfaces/product';
import { HandleErrorsService } from './handel-errors.service';
import { CacheService } from './cashing.service';

@Injectable({
  providedIn: 'root',
})
export class FilterService {
  constructor(
    private wooAPI: ApiService,
    private handleErrorsService: HandleErrorsService,
    private cachingService: CacheService
  ) {}

  /**
   * Fetch attributes and terms for a category from a specific page
   */
// في FilterService
getAttributesAndTermsByCategory(
  categoryId: number,
  page: number = 1,
  perPage: number = 100
): Observable<{ attributes: { [key: string]: { name: string; terms: { id: number; name: string }[] } }; totalPages: number }> {
  const cacheKey = `attributes_terms_category_${categoryId}_page_${page}`;
  console.log(`Fetching attributes for category ${categoryId}, page ${page}`);
  return this.cachingService.cacheObservable(
    cacheKey,
    this.wooAPI.getRequestProducts<any>('products', {
      params: new HttpParams()
        .set('category', categoryId.toString())
        .set('_fields', 'id,attributes')
        .set('per_page', perPage.toString())
        .set('page', page.toString()),
      observe: 'response',
    }).pipe(
      map((response: HttpResponse<any>) => {
        console.log('API response received for category', categoryId, response);
        return this.processAttributes(response);
      }),
      catchError((error) => {
        console.error(`Error fetching attributes/terms for category ${categoryId}:`, error);
        return of({ attributes: {}, totalPages: 1 });
      }),
      shareReplay(1)
    ),
    300000
  );
}
  /**
   * 
   * Process attributes from API response (لدعم Web Workers لو حبيتِ تستخدمه)
   */
  processAttributes(response: HttpResponse<any>): { attributes: { [key: string]: { name: string; terms: { id: number; name: string }[] } }; totalPages: number } {
    const products = response.body || [];
    const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1', 10);
    console.log('Raw products from API:', products); // اطبع المنتجات الخام
    const attributesMap = new Map<string, { name: string; terms: Map<number, { id: number; name: string }> }>();
  
    products.forEach((product: any) => {
      (product.attributes || []).forEach((attr: any) => {
        const attrSlug = attr.slug || attr.name;
        if (!attributesMap.has(attrSlug)) {
          attributesMap.set(attrSlug, { name: attr.name, terms: new Map() });
        }
        if (attr.options && Array.isArray(attr.options)) {
          attr.options.forEach((option: { id: number; name: string }) => {
            if (option.id && option.name) {
              const termId = option.id;
              if (!attributesMap.get(attrSlug)!.terms.has(termId)) {
                attributesMap.get(attrSlug)!.terms.set(termId, { id: termId, name: option.name });
              }
            }
          });
        }
      });
    });
  
    const result = {
      attributes: Object.fromEntries(
        Array.from(attributesMap.entries()).map(([slug, data]) => [
          slug,
          { name: data.name, terms: Array.from(data.terms.values()) }
        ])
      ),
      totalPages,
    };
    console.log('Processed attributes:', result); // اطبع السمات المعالجة
    return result;
  }

  /**
   * Fetch all attributes and terms across all pages for a category
   */
  getAllAttributesAndTermsByCategory(categoryId: number): Observable<{ [key: string]: { name: string; terms: { id: number; name: string }[] } }> {
    return this.getAttributesAndTermsByCategory(categoryId, 1, 100).pipe(
      switchMap((firstResponse:any) => {
        const totalPages = firstResponse.totalPages;
        if (totalPages <= 1) {
          return of(firstResponse.attributes);
        }
        const requests = Array.from({ length: totalPages - 1 }, (_, i) =>
          this.getAttributesAndTermsByCategory(categoryId, i + 2, 100)
        );
        return forkJoin(requests).pipe(
          map((responses:any) => {
            const allAttributes = { ...firstResponse.attributes };
            responses.forEach((res:any) => {
              Object.entries(res.attributes).forEach(([slug, attrData]:any) => {
                if (!allAttributes[slug]) {
                  allAttributes[slug] = { name: attrData.name, terms: [] };
                }
                const existingTermIds = new Set(allAttributes[slug].terms.map((t:any) => t.id));
                attrData.terms.forEach((term:any) => {
                  if (!existingTermIds.has(term.id)) {
                    allAttributes[slug].terms.push(term);
                  }
                });
              });
            });
            return allAttributes;
          })
        );
      })
    );
  }

  /**
   * Fetch filtered products based on selected attributes and terms
   */
  getFilteredProductsByCategory(
    categoryId: number | null,
    filters: { [key: string]: string[] },
    page: number = 1,
    perPage: number = 18,
    orderby: string = 'date',
    order: 'asc' | 'desc' = 'desc'
  ): Observable<Product[]> {
    const cacheKey = `filtered_products_category_${categoryId || 'all'}_filters_${JSON.stringify(filters)}_page_${page}_orderby_${orderby}_order_${order}`;
    return this.cachingService.cacheObservable(
      cacheKey,
      this.wooAPI.getRequestProducts<any>('products', {
        params: this.buildFilterParams(categoryId, filters, page, perPage, orderby, order),
        observe: 'response',
      }).pipe(
        map((response: HttpResponse<any>) => {
          console.log('API Request URL:', `${response.url}`);
          return (response.body || []).map((product: any) => ({
            ...product,
            images: product.images?.slice(0, 3) || [],
          }));
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

  /**
   * Build HTTP params for filtering products
   */
  private buildFilterParams(
    categoryId: number | null,
    filters: { [key: string]: string[] },
    page: number,
    perPage: number,
    orderby: string,
    order: 'asc' | 'desc'
  ): HttpParams {
    let params = new HttpParams()
      .set('orderby', orderby)
      .set('order', order)
      .set('page', page.toString())
      .set('per_page', perPage.toString())
      .set('_fields', 'id,name,price,images,categories,description,sale_price,regular_price,on_sale,variations,currency,attributes');

    if (categoryId) {
      params = params.set('category', categoryId.toString());
    }

    if (Object.keys(filters).length > 0) {
      params = params.set('attributes', JSON.stringify(filters));
    }

    console.log('Generated Params:', params.toString());
    return params;
  }

  /**
   * Fetch available attributes and terms based on current filters
   */
  getAvailableAttributesAndTerms(
    categoryId: number,
    filters: { [key: string]: string[] }
  ): Observable<{ [key: string]: { name: string; terms: { id: number; name: string }[] } }> {
    const cacheKey = `available_attributes_terms_category_${categoryId}_filters_${JSON.stringify(filters)}`;
    return this.cachingService.cacheObservable(
      cacheKey,
      this.wooAPI.getRequestProducts<any>('products', {
        params: this.buildFilterParams(categoryId, filters, 1, 100, 'date', 'desc'),
        observe: 'response',
      }).pipe(
        map((response: HttpResponse<any>) => this.processAttributes(response).attributes),
        catchError((error) => {
          console.error(`Error fetching available attributes/terms:`, error);
          return of({});
        }),
        shareReplay(1)
      ),
      300000
    );
  }
}