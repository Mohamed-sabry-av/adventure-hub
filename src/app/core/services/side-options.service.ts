import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Product, Variation } from '../../interfaces/product';
import { VariationService } from './variation.service';

export interface SideOptionsState {
  isOpen: boolean;
  product: Product | any;
  selectedVariation: Variation | null;
  uniqueSizes: { size: string; inStock: boolean }[];
  selectedSize: string | null;
  colorOptions: { color: string; image: string; inStock: boolean }[];
  selectedColor: string | null;
  visibleColors: { color: string; image: string; inStock: boolean }[];
  isMobile: boolean;
  variations: Variation[];
  showOutOfStockVariations: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class SideOptionsService {
  private stateSubject = new BehaviorSubject<SideOptionsState>({
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
    showOutOfStockVariations: true,
  });

  state$ = this.stateSubject.asObservable();

  constructor(private variationService: VariationService) {}

  openSideOptions(state: Partial<SideOptionsState>): void {
    const currentState = this.stateSubject.getValue();
    const newState = {
      ...currentState,
      ...state,
      isOpen: true,
    };

    // Initialize uniqueSizes based on variations (with or without color)
    newState.uniqueSizes = this.variationService.getSizesForColor(
      newState.variations,
      newState.selectedColor || null
    );

    // Initialize default selections
    if (newState.product && !newState.selectedSize && !newState.selectedColor) {
      const defaultAttributes = newState.product.default_attributes || [];
      const hasColorAttribute = defaultAttributes.some((attr: any) => attr.name === 'Color');

      if (hasColorAttribute) {
        const defaultColor = defaultAttributes.find((attr: any) => attr.name === 'Color')?.option;
        if (defaultColor) {
          newState.selectedColor = defaultColor;
          newState.uniqueSizes = this.variationService.getSizesForColor(newState.variations, defaultColor);
        }
      }

      // Select default size or first in-stock size
      const defaultSize = defaultAttributes.find((attr: any) => attr.name === 'Size')?.option;
      const firstInStockSize = newState.uniqueSizes.find((s) => s.inStock);
      if (defaultSize && newState.uniqueSizes.some((s) => s.size === defaultSize)) {
        newState.selectedSize = defaultSize;
      } else if (firstInStockSize) {
        newState.selectedSize = firstInStockSize.size;
      } else if (newState.uniqueSizes.length > 0 && newState.showOutOfStockVariations) {
        newState.selectedSize = newState.uniqueSizes[0].size;
      }

      // Update selectedVariation based on selectedColor and selectedSize
      if (newState.selectedSize) {
        const selectedAttributes = {
          Size: newState.selectedSize,
          ...(newState.selectedColor ? { Color: newState.selectedColor } : {}),
        };
        newState.selectedVariation = this.variationService.findVariationByAttributes(
          newState.variations,
          selectedAttributes
        );
      }
    }

    this.stateSubject.next(newState);
  }

  closeSideOptions(): void {
    this.stateSubject.next({
      ...this.stateSubject.getValue(),
      isOpen: false,
    });
  }

  selectSize(size: string): void {
    const currentState = this.stateSubject.getValue();
    const newState = {
      ...currentState,
      selectedSize: size,
    };

    // Update selectedVariation based on selectedColor and selectedSize
    if (newState.selectedSize) {
      const selectedAttributes = {
        Size: newState.selectedSize,
        ...(newState.selectedColor ? { Color: newState.selectedColor } : {}),
      };
      newState.selectedVariation = this.variationService.findVariationByAttributes(
        newState.variations,
        selectedAttributes
      );
    }

    this.stateSubject.next(newState);
  }

  selectColor(color: string, image: string): void {
    const currentState = this.stateSubject.getValue();
    const newState:any = {
      ...currentState,
      selectedColor: color,
      selectedSize: null, // Reset size when color changes
      uniqueSizes: this.variationService.getSizesForColor(currentState.variations, color),
    };

    // Select first in-stock size if available
    const firstInStockSize = newState.uniqueSizes.find((s:any) => s.inStock);
    if (firstInStockSize) {
      newState.selectedSize = firstInStockSize.size;
    } else if (newState.uniqueSizes.length > 0 && currentState.showOutOfStockVariations) {
      newState.selectedSize = newState.uniqueSizes[0].size;
    }

    // Update selectedVariation based on selectedColor and selectedSize
    if (newState.selectedColor && newState.selectedSize) {
      const selectedAttributes = {
        Color: newState.selectedColor,
        Size: newState.selectedSize,
      };
      newState.selectedVariation = this.variationService.findVariationByAttributes(
        newState.variations,
        selectedAttributes
      );
    }

    this.stateSubject.next(newState);
  }
}