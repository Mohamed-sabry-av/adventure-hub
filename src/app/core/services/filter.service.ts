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
    private WooAPI: ApiService,
    private handleErrorsService: HandleErrorsService,
    private cachingService: CacheService
  ) {}

  /**
   * Fetch attributes and terms for a category from a specific page
   */
  getAttributesAndTermsByCategory(
    categoryId: number,
    page: number = 1,
    perPage: number = 100
  ): Observable<{ attributes: { [key: string]: { name: string; terms: { id: number; name: string }[] } }; totalPages: number }> {
    const cacheKey = `attributes_terms_category_${categoryId}_page_${page}`;
    return this.cachingService.cacheObservable(
      cacheKey,
      this.WooAPI.getRequestProducts<any>('products', {
        params: new HttpParams()
          .set('category', categoryId.toString())
          .set('_fields', 'id,attributes') // جيب بس الحقول اللي محتاجها عشان الأداء
          .set('per_page', perPage.toString())
          .set('page', page.toString()),
        observe: 'response',
      }).pipe(
        map((response: HttpResponse<any>) => {
          const products = response.body;
          const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1', 10);
          const attributesMap = new Map<string, { name: string; terms: Map<number, { id: number; name: string }> }>();

          products.forEach((product: any) => {
            product.attributes.forEach((attr: any) => {
              const attrSlug = attr.slug || attr.name; // استخدم الـ slug كمفتاح رئيسي
              if (!attributesMap.has(attrSlug)) {
                attributesMap.set(attrSlug, { name: attr.name, terms: new Map() });
              }
              if (attr.options && Array.isArray(attr.options)) {
                attr.options.forEach((option: { id: number; name: string }) => {
                  if (option.id && option.name) { // تأكد إن الـ id و name موجودين
                    const termId = option.id;
                    if (!attributesMap.get(attrSlug)!.terms.has(termId)) {
                      attributesMap.get(attrSlug)!.terms.set(termId, { id: termId, name: option.name });
                    }
                  }
                });
              }
            });
          });

          return {
            attributes: Object.fromEntries(
              Array.from(attributesMap.entries()).map(([slug, data]) => [
                slug,
                { name: data.name, terms: Array.from(data.terms.values()) }
              ])
            ),
            totalPages,
          };
        }),
        catchError((error) => {
          console.error(`Error fetching attributes/terms for category ${categoryId}:`, error);
          return of({ attributes: {}, totalPages: 1 });
        }),
        shareReplay(1)
      ),
      300000 // 5 دقايق TTL للكاش
    );
  }

  /**
   * Fetch all attributes and terms across all pages for a category
   */
  getAllAttributesAndTermsByCategory(categoryId: number): Observable<{ [key: string]: { name: string; terms: { id: number; name: string }[] } }> {
    return this.getAttributesAndTermsByCategory(categoryId, 1, 100).pipe(
      switchMap((firstResponse) => {
        const totalPages = firstResponse.totalPages;
        if (totalPages <= 1) {
          return of(firstResponse.attributes);
        }
        // جيب كل الصفحات المتبقية باستخدام forkJoin عشان تتحمل بالتوازي
        const requests = Array.from({ length: totalPages - 1 }, (_, i) =>
          this.getAttributesAndTermsByCategory(categoryId, i + 2, 100)
        );
        return forkJoin(requests).pipe(
          map((responses) => {
            const allAttributes: { [slug: string]: { name: string; terms: { id: number; name: string }[] } } = { ...firstResponse.attributes };
            responses.forEach((res) => {
              Object.entries(res.attributes).forEach(([slug, attrData]) => {
                if (!allAttributes[slug]) {
                  allAttributes[slug] = { name: attrData.name, terms: [] };
                }
                const existingTermIds = new Set(allAttributes[slug].terms.map(t => t.id));
                attrData.terms.forEach(term => {
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
          // اطبعي الـ URL هنا
          const fullUrl = `${response.url}`; // الـ URL الكامل بتاع الـ request
          console.log('API Request URL:', fullUrl);
          return response.body.map((product: any) => ({
            ...product,
            images: product.images.slice(0, 3) || [],
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
    perPage: number
  ): HttpParams {
    let params = new HttpParams()
      .set('per_page', perPage.toString())
      .set('page', page.toString())
      .set('_fields', 'id,name,price,images,categories,description,sale_price,regular_price,on_sale,variations,currency');
  
    if (categoryId) {
      params = params.set('category', categoryId.toString());
    }
  
    // تحويل filters إلى سلسلة JSON وإضافتها كمعلمة attributes
    if (Object.keys(filters).length > 0) {
      const attributesJson = JSON.stringify(filters); // بيحول filters إلى JSON زي {"pa_brand":["3077","350"],"pa_color":["59","160"]}
      params = params.set('attributes', attributesJson);
    }
  
    console.log('Generated Params:', params.toString());
    return params;
  }
  
}