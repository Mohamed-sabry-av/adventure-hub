import { HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, shareReplay, switchMap } from 'rxjs';
import { ApiService } from './api.service';
import { HandleErrorsService } from './handel-errors.service';
import { CacheService } from './cashing.service';
import { ProductService } from './product.service';
import { Product } from '../../interfaces/product';

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

  // Fetch all attributes
  getProductAttributes(): Observable<any[]> {
    return this.WooAPI.getRequestProducts<any>('products/attributes', {
      params: new HttpParams(),
    }).pipe(
      map((response) => response),
      catchError((error) => this.handleErrorsService.handelError(error))
    );
  }

  // Fetch terms for a specific attribute by attribute ID
  getAttributeTerms(attributeId: number): Observable<any[]> {
    return this.WooAPI.getRequestProducts<any>(`products/attributes/${attributeId}/terms`, {
      params: new HttpParams().set('per_page', '100'), // Adjust as needed
    }).pipe(
      map((response) => response),
      catchError((error) => {
        console.error(`Error fetching terms for attribute ${attributeId}:`, error);
        return of([]);
      })
    );
  }

  // Fetch attributes and terms by category
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
        observe: 'response', // نرجع الـ response كامل مع الـ headers
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
      300000 // 5 دقايق TTL
    );
  }


  // Fetch all attributes and terms recursively
  getAllAttributesAndTermsByCategory(categoryId: number): Observable<{ [key: string]: string[] }> {
    const allTerms = new Map<string, Set<string>>(); // لتخزين السمات والشروط المتراكمة
    let page = 1;
    const perPage = 100;
  
    const fetchPage = (currentPage: number): Observable<any> =>
      this.getAttributesAndTermsByCategory(categoryId, currentPage, perPage).pipe(
        switchMap((response) => {
          const { terms, totalPages } = response;
          // إضافة السمات والشروط من الصفحة الحالية
          Object.entries(terms).forEach(([attr, options]) => {
            if (!allTerms.has(attr)) {
              allTerms.set(attr, new Set());
            }
            options.forEach((opt) => allTerms.get(attr)!.add(opt));
          });
          // إذا كانت هناك صفحات أخرى، جلب الصفحة التالية
          if (currentPage < totalPages) {
            return fetchPage(currentPage + 1);
          } else {
            // إرجاع النتيجة النهائية
            return of(
              Object.fromEntries(
                Array.from(allTerms.entries()).map(([name, terms]) => [name, Array.from(terms)])
              )
            );
          }
        })
      );
  
    return fetchPage(page);
  }



  // Get filtered products by category
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
        map((response: HttpResponse<any>) => {
          console.log(`API response for filtered products (category: ${categoryId}, page: ${page}):`, response.body.length);
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
      300000 // 5 minutes TTL
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
      .set('_fields', 'id,name,price,images,categories,description,sale_price,regular_price,on_sale,variations,currency')
      // .set('stock_status', 'instock');

    if (categoryId) {
      params = params.set('category', categoryId.toString());
    }

    Object.entries(filters).forEach(([attrSlug, terms]) => {
      if (terms.length > 0) {
        params = params.set('attribute', attrSlug);
        params = params.set('attribute_term', terms.join(','));
      }
    });

    console.log('Built API params:', params.toString());
    return params;
  }
}