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
  selectedColor: any | null;
  visibleColors: { color: string; image: string; inStock: boolean }[];
  isMobile: boolean;
}

@Injectable({
  providedIn: 'root'
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
    isMobile: false
  };

  private stateSubject = new BehaviorSubject<SideOptionsState>(this.initialState);

  get state$(): Observable<SideOptionsState> {
    return this.stateSubject.asObservable();
  }

  get currentState(): SideOptionsState {
    return this.stateSubject.getValue();
  }

  openSideOptions(options: Partial<SideOptionsState>): void {
    this.stateSubject.next({
      ...this.currentState,
      isOpen: true,
      ...options
    });
  }

  closeSideOptions(): void {
    this.stateSubject.next({
      ...this.currentState,
      isOpen: false
    });
  }

  updateOptions(options: Partial<SideOptionsState>): void {
    this.stateSubject.next({
      ...this.currentState,
      ...options
    });
  }

  selectSize(size: string): void {
    this.stateSubject.next({
      ...this.currentState,
      selectedSize: size
    });
  }

  selectColor(color: string, image: string): void {
    this.stateSubject.next({
      ...this.currentState,
      selectedColor: color
    });
  }

  reset(): void {
    this.stateSubject.next(this.initialState);
  }
}
