import { Injectable } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { Observable, forkJoin, map, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SearchBarService {
  constructor(private wooApi: ApiService) {}

  /**
   * Search for products with expanded options
   * @param searchTerm Search query
   * @returns Observable with enhanced product data
   */
  SearchProducts(searchTerm: string): Observable<any[]> {
    if (!searchTerm.trim()) {
      return of([]);
    }
  
    return this.wooApi
      .getRequest<any[]>(`products?search=${searchTerm}&_embed=true&status=publish`)
      .pipe(
        map((products: any[]) => {
          return products.map((product) => ({
            ...product,
            onSale:
              product.sale_price &&
              parseFloat(product.sale_price) < parseFloat(product.regular_price),
            discountPercentage:
              product.sale_price && product.regular_price
                ? Math.round(
                    ((parseFloat(product.regular_price) -
                      parseFloat(product.sale_price)) /
                      parseFloat(product.regular_price)) *
                      100
                  )
                : 0,
          }));
        })
      );
  }
  /**
   * Search for categories
   * @param searchTerm Search query
   * @returns Observable with categories data
   */
  SearchCategories(searchTerm: string): Observable<any> {
    if (!searchTerm.trim()) {
      return of([]);
    }

    return this.wooApi.getRequest(`products/categories?search=${searchTerm}`);
  }

  /**
   * Comprehensive search for both products and categories
   * @param searchTerm Search query
   * @returns Combined results
   */
  ComprehensiveSearch(searchTerm: string): Observable<any> {
    if (!searchTerm.trim()) {
      return of({ products: [], categories: [] });
    }

    return forkJoin({
      products: this.SearchProducts(searchTerm),
      categories: this.SearchCategories(searchTerm),
    });
  }

  /**
   * Get product categories by product ID
   * @param productId Product ID
   * @returns Observable with product categories
   */
  GetProductCategories(productId: number): Observable<any> {
    return this.wooApi.getRequest(`products/${productId}/categories`);
  }
}
