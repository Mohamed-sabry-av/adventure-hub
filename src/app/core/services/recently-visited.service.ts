import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Product } from '../../interfaces/product';

@Injectable({
  providedIn: 'root'
})
export class RecentlyVisitedService {
  private readonly STORAGE_KEY = 'recentlyVisitedProducts';
  private readonly MAX_PRODUCTS = 20; // Maximum number of products to store

  private recentlyVisitedProductsSubject = new BehaviorSubject<Product[]>([]);

  constructor() {
    this.loadFromLocalStorage();
  }

  get recentlyVisitedProducts$(): Observable<Product[]> {
    return this.recentlyVisitedProductsSubject.asObservable();
  }

  addProduct(product: Product): void {
    if (!product) return;

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
    localStorage.removeItem(this.STORAGE_KEY);
  }

  removeProduct(productId: number): void {
    const currentProducts = this.recentlyVisitedProductsSubject.value;
    const updatedProducts = currentProducts.filter(p => p.id !== productId);

    this.recentlyVisitedProductsSubject.next(updatedProducts);
    this.saveToLocalStorage(updatedProducts);
  }

  private loadFromLocalStorage(): void {
    try {
      const storedProducts = localStorage.getItem(this.STORAGE_KEY);
      if (storedProducts) {
        const products = JSON.parse(storedProducts) as Product[];
        this.recentlyVisitedProductsSubject.next(products);
      }
    } catch (error) {
      console.error('Error loading recently visited products from localStorage:', error);
      // If there's an error, reset the storage
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  private saveToLocalStorage(products: Product[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(products));
    } catch (error) {
      console.error('Error saving recently visited products to localStorage:', error);
    }
  }
}
