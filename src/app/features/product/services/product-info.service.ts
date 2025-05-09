import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { VariationService } from '../../../core/services/variation.service';
import { ProductAttributeOption } from '../components/product-info/product-info.component';

export interface AttributeSelection {
  name: string;
  value: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ProductInfoService {
  private selectedAttributes: { [key: string]: string | null } = {};
  private showOutOfStockVariations = true;

  constructor(private variationService: VariationService) {}

  /**
   * Set default attributes for a product
   */
  setDefaultAttributes(product: any): { [key: string]: string | null } {
    if (!product || product.type === 'simple') {
      return {};
    }

    const selectedAttributes: { [key: string]: string | null } = {};
    const variations = product.variations || [];
    
    if (!Array.isArray(variations) || !variations.length) {
      return {};
    }

    const variationAttributes = this.getVariationAttributes(product);
    const defaultAttributes = product.default_attributes || [];

    const inStockVariation = variations.find(
      (v: any) => v.stock_status === 'instock'
    );
    let defaultAttributesToUse = defaultAttributes;

    if (
      inStockVariation &&
      !this.isDefaultVariationInStock(defaultAttributes, variations)
    ) {
      defaultAttributesToUse = inStockVariation.attributes.map((attr: any) => ({
        name: attr.name,
        option: attr.option,
      }));
    }

    variationAttributes.forEach((attrName: string) => {
      const defaultAttr = defaultAttributesToUse.find(
        (attr: any) => attr.name === attrName
      );
      let selectedOption = null;

      // Get attribute options for the current attribute name
      const attrOptions = this.getVariationOptions(
          product,
          attrName,
          attrName === 'Size' ? selectedAttributes['Color'] : null
      );

      if (defaultAttr) {
        selectedOption = attrOptions.find(
          (opt) =>
            opt.value.toLowerCase() === defaultAttr.option.toLowerCase() &&
            (opt.inStock || true) // Always show out of stock variations
        );
      }

      if (!selectedOption) {
        selectedOption = attrOptions.find((opt) => opt.inStock);
      }

      if (!selectedOption && attrOptions && attrOptions.length > 0) {
        selectedOption = attrOptions[0];
      }

      if (selectedOption) {
        selectedAttributes[attrName] = selectedOption.value;
      } else {
        selectedAttributes[attrName] = null;
      }
    });

    return selectedAttributes;
  }

  /**
   * Check if the default variation is in stock
   */
  private isDefaultVariationInStock(defaultAttributes: any[], variations: any[]): boolean {
    const defaultAttrsMap = defaultAttributes.reduce((acc: any, attr: any) => {
      acc[attr.name] = attr.option;
      return acc;
    }, {});
    
    const defaultVariation = this.variationService.findVariationByAttributes(variations, defaultAttrsMap);
    return defaultVariation?.stock_status === 'instock';
  }

  /**
   * Find a variation by its attributes
   */
  findVariationByAttributes(variations: any[], attributes: { [key: string]: string }): any {
    return variations.find((variation) => {
      const variationAttrs = variation.attributes.reduce((acc: any, attr: any) => {
        acc[attr.name] = attr.option;
        return acc;
      }, {});
      
      return Object.keys(attributes).every(
        (key) =>
          !attributes[key] ||
          variationAttrs[key]?.toLowerCase() === attributes[key]?.toLowerCase()
      );
    });
  }

  /**
   * Get variation attributes from a product
   */
  getVariationAttributes(product: any): string[] {
    if (!product || product.type !== 'variable') {
      return [];
    }

    const attributes = product.attributes || [];
    return attributes
      .filter((attr: any) => attr.variation)
      .map((attr: any) => attr.name);
  }

  /**
   * Get variation options for a given attribute
   */
  getVariationOptions(
    product: any,
    attributeName: string,
    dependentAttributeValue: string | null = null
  ): ProductAttributeOption[] {
    if (!product || !product.attributes) {
      return [];
    }

    const attribute = product.attributes.find(
      (attr: any) => attr.name === attributeName
    );
    if (!attribute) {
      return [];
    }

    // Get variations where the dependent attribute (e.g., Color) matches the selected value
    const relevantVariations = product.variations.filter((variation: any) => {
      if (!dependentAttributeValue) {
        return true; // No filtering needed
      }

      const matchingAttr = variation.attributes.find(
        (attr: any) =>
          attr.name === 'Color' && 
          attr.option.toLowerCase() === dependentAttributeValue.toLowerCase()
      );
      return !!matchingAttr;
    });

    // Get available options from the filtered variations
    const availableOptions = new Set<string>();
    relevantVariations.forEach((variation: any) => {
      const attr = variation.attributes.find(
        (a: any) => a.name === attributeName
      );
      if (attr && attr.option) {
        availableOptions.add(attr.option);
      }
    });

    // For color options, add image information
    if (attributeName === 'Color') {
      return Array.from(availableOptions).map((option) => {
        const variation = product.variations.find((v: any) =>
          v.attributes.some(
            (a: any) =>
              a.name === 'Color' && a.option.toLowerCase() === option.toLowerCase()
          )
        );

        const inStock =
          relevantVariations.some(
            (v: any) =>
              v.stock_status === 'instock' &&
              v.attributes.some(
                (a: any) =>
                  a.name === 'Color' && a.option.toLowerCase() === option.toLowerCase()
              )
          ) || false;

        return {
          value: option,
          image: variation?.image?.src || product.images[0]?.src,
          inStock,
        };
      });
    }

    // For other options (like Size)
    return Array.from(availableOptions).map((option) => {
      const inStock =
        relevantVariations.some(
          (v: any) =>
            v.stock_status === 'instock' &&
            v.attributes.some(
              (a: any) =>
                a.name === attributeName && a.option.toLowerCase() === option.toLowerCase()
            )
        ) || false;

      return {
        value: option,
        inStock,
      };
    });
  }

  /**
   * Get the selected variation based on selected attributes
   */
  getSelectedVariation(product: any, selectedAttributes: { [key: string]: string | null }): any {
    if (!product || product.type !== 'variable' || !product.variations) {
      return null;
    }

    // Only look for variations when all attributes are selected
    if (!this.allVariationAttributesSelected(product, selectedAttributes)) {
      return null;
    }

    const variation = product.variations.find((v: any) => {
      return v.attributes.every((attr: any) => {
        const selectedValue = selectedAttributes[attr.name];
        return (
          selectedValue &&
          attr.option.toLowerCase() === selectedValue.toLowerCase()
        );
      });
    });

    return variation || null;
  }

  /**
   * Check if all variation attributes are selected
   */
  allVariationAttributesSelected(product: any, selectedAttributes: { [key: string]: string | null }): boolean {
    if (!product || product.type !== 'variable') {
      return true;
    }

    const variationAttributes = this.getVariationAttributes(product);
    return variationAttributes.every(
      (attrName) => !!selectedAttributes[attrName]
    );
  }

  /**
   * Check if a product is in stock based on selected attributes
   */
  isProductInStock(product: any, selectedAttributes: { [key: string]: string | null }): boolean {
    if (!product) {
      return false;
    }

    if (product.type === 'simple') {
      return product.stock_status === 'instock';
    }

    const variation = this.getSelectedVariation(product, selectedAttributes);
    return variation ? variation.stock_status === 'instock' : false;
  }

  /**
   * Check if a product is completely out of stock
   */
  isCompletelyOutOfStock(product: any): boolean {
    if (!product) {
      return true;
    }

    if (product.type === 'simple') {
      return product.stock_status !== 'instock';
    }

    // For variable products, check if any variation is in stock
    return !product.variations.some((v: any) => v.stock_status === 'instock');
  }

  /**
   * Get price information for a product
   */
  getPriceInfo(product: any, selectedAttributes: { [key: string]: string | null }): { 
    price: string; 
    regularPrice: string; 
    isOnSale: boolean 
  } {
    if (!product) {
      return { price: '0', regularPrice: '0', isOnSale: false };
    }

    if (product.type === 'variable') {
      const variation = this.getSelectedVariation(product, selectedAttributes);
      if (variation) {
        const isOnSale = variation.on_sale;
        const price = variation.price || '0';
        const regularPrice = variation.regular_price || price;
        return { price, regularPrice, isOnSale };
      }
    }

    // For simple products or when no variation is selected
    const isOnSale = product.on_sale;
    const price = product.sale_price || product.price || '0';
    const regularPrice = product.regular_price || product.price || '0';
    
    return { price, regularPrice, isOnSale };
  }

  /**
   * Prepare product for adding to cart
   */
  prepareCartProduct(
    product: any,
    selectedAttributes: { [key: string]: string | null },
    quantity: number
  ): any {
    if (!product) {
      return null;
    }

    if (product.type === 'simple') {
      return {
        ...product,
        quantity,
      };
    }

    const variation = this.getSelectedVariation(product, selectedAttributes);
    if (!variation) {
      return null;
    }

    return {
      ...variation,
      parent_id: product.id,
      parent_name: product.name,
      parent_sku: product.sku,
      attributes: Object.keys(selectedAttributes).map((key) => ({
        name: key,
        option: selectedAttributes[key],
      })),
      quantity,
      type: 'variation',
    };
  }
}
