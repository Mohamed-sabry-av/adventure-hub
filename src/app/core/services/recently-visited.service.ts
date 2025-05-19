import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Product } from '../../interfaces/product';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class RecentlyVisitedService {
  private readonly STORAGE_KEY = 'recentlyVisitedProducts';
  private readonly MAX_PRODUCTS = 20; // Maximum number of products to store

  private recentlyVisitedProductsSubject = new BehaviorSubject<Product[]>([]);
  private platformId = inject(PLATFORM_ID);

  constructor() {
    console.log('RecentlyVisitedService - Initializing');
    this.loadFromLocalStorage();
  }

  get recentlyVisitedProducts$(): Observable<Product[]> {
    return this.recentlyVisitedProductsSubject.asObservable();
  }

  // Get the current value without subscribing
  get currentProducts(): Product[] {
    return this.recentlyVisitedProductsSubject.value;
  }

  addProduct(product: Product): void {
    if (!product) {
      return;
    }

    const currentProducts = this.recentlyVisitedProductsSubject.value;

    // Remove the product if it already exists (to move it to the top)
    const filteredProducts = currentProducts.filter(p => p.id !== product.id);

    // Add the product to the beginning of the array
    const updatedProducts = [product, ...filteredProducts].slice(0, this.MAX_PRODUCTS);

    // Update the subject and localStorage
    this.recentlyVisitedProductsSubject.next(updatedProducts);
    this.saveToLocalStorage(updatedProducts);
  }

  clearHistory(): void {
    this.recentlyVisitedProductsSubject.next([]);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  removeProduct(productId: number): void {
    const currentProducts = this.recentlyVisitedProductsSubject.value;
    const updatedProducts = currentProducts.filter(p => p.id !== productId);

    this.recentlyVisitedProductsSubject.next(updatedProducts);
    this.saveToLocalStorage(updatedProducts);
    console.log('RecentlyVisitedService - Product removed:', productId);
  }



  private loadFromLocalStorage(): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('RecentlyVisitedService - Not in browser environment, skipping localStorage loading');
      return;
    }
    
    try {
      const storedProducts = localStorage.getItem(this.STORAGE_KEY);
      if (storedProducts) {
        const products = JSON.parse(storedProducts) as Product[];
        this.recentlyVisitedProductsSubject.next(products);
      } else {

      }
    } catch (error) {
      // If there's an error, reset the storage
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  private saveToLocalStorage(products: Product[]): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(products));
    } catch (error) {
      console.error('RecentlyVisitedService - Error saving to localStorage:', error);
    }
  }
}
