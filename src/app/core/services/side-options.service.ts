import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Product, Variation } from '../../interfaces/product';

export interface SideOptionsState {
  isOpen: boolean;
  product: Product | null;
  selectedVariation: Variation | null;
  uniqueSizes: { size: string; inStock: boolean }[];
  selectedSize: string | null;
  colorOptions: { color: string; image: string; inStock: boolean }[];
  selectedColor: string | null;
  visibleColors: { color: string; image: string; inStock: boolean }[];
  isMobile: boolean;
  variations: Variation[];
}

@Injectable({
  providedIn: 'root',
})
export class SideOptionsService {
  private initialState: SideOptionsState = {
    isOpen: false,
    product: null,
    selectedVariation: null,
    uniqueSizes: [],
    selectedSize: null,
    colorOptions: [],
    selectedColor: null,
    visibleColors: [],
    isMobile: false,
    variations: [],
  };

  private stateSubject = new BehaviorSubject<SideOptionsState>(
    this.initialState
  );

  get state$(): Observable<SideOptionsState> {
    return this.stateSubject.asObservable();
  }

  get currentState(): SideOptionsState {
    return this.stateSubject.getValue();
  }

  openSideOptions(options: Partial<SideOptionsState>): void {
    console.log('Options Should Open');
    const selectedColor =
      options.selectedColor || this.currentState.selectedColor;
    const uniqueSizes = this.getSizesForColor(
      selectedColor || '',
      options.variations || []
    );
    this.stateSubject.next({
      ...this.initialState,
      isOpen: true,
      ...options,
      uniqueSizes: uniqueSizes,
    });
  }

  closeSideOptions(): void {
    this.stateSubject.next({
      ...this.currentState,
      isOpen: false,
    });
  }

  updateOptions(options: Partial<SideOptionsState>): void {
    this.stateSubject.next({
      ...this.currentState,
      ...options,
    });
  }

  selectSize(size: string): void {
    this.stateSubject.next({
      ...this.currentState,
      selectedSize: size,
    });
  }

  selectColor(color: string, image: string): void {
    const uniqueSizes = this.getSizesForColor(
      color,
      this.currentState.variations
    );
    let newSelectedSize = this.currentState.selectedSize;

    // Check if the current selected size is still available
    const sizeStillAvailable = uniqueSizes.find(
      (s) => s.size === newSelectedSize
    );
    if (!sizeStillAvailable || !sizeStillAvailable.inStock) {
      const firstInStockSize = uniqueSizes.find((s) => s.inStock);
      newSelectedSize = firstInStockSize ? firstInStockSize.size : null;
    }

    this.stateSubject.next({
      ...this.currentState,
      selectedColor: color,
      uniqueSizes: uniqueSizes,
      selectedSize: newSelectedSize,
    });
  }

  private getSizesForColor(
    color: string,
    variations: Variation[]
  ): { size: string; inStock: boolean }[] {
    if (!variations || !color) return [];
    const sizesMap = new Map<string, boolean>();
    const filteredVariations = variations.filter((v) =>
      v.attributes?.some(
        (attr: any) => attr.name === 'Color' && attr.option === color
      )
    );

    filteredVariations.forEach((v) => {
      const sizeAttr = v.attributes?.find((attr: any) => attr.name === 'Size');
      if (sizeAttr) {
        const inStock = v.stock_status === 'instock';
        if (!sizesMap.has(sizeAttr.option) || inStock) {
          sizesMap.set(sizeAttr.option, inStock);
        }
      }
    });

    return Array.from(sizesMap, ([size, inStock]) => ({ size, inStock })).sort(
      (a, b) => {
        if (a.inStock && !b.inStock) return -1;
        if (!a.inStock && b.inStock) return 1;
        const aNum = Number(a.size);
        const bNum = Number(b.size);
        return !isNaN(aNum) && !isNaN(bNum)
          ? aNum - bNum
          : a.size.localeCompare(b.size);
      }
    );
  }

  reset(): void {
    this.stateSubject.next(this.initialState);
  }
}
