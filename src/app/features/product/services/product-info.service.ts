import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { VariationService } from '../../../core/services/variation.service';

export interface ProductAttributeOption {
  value: string;
  image?: string;
  inStock: boolean;
}

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

  getVariationAttributes(product: any): string[] {
    return (
      product?.attributes
        ?.filter((attr: any) => attr.variation)
        ?.map((attr: any) => attr.name) || []
    );
  }

  getVariationOptions(
    product: any,
    attributeName: string,
    dependentAttributeValue: string | null = null
  ): ProductAttributeOption[] {
    if (!product) return [];

    const variations = product.variations || [];
    if (!Array.isArray(variations) || !variations.length) {
      return [];
    }

    if (attributeName === 'Color') {
      const colorOptions = this.variationService.getColorOptions(variations);
      return colorOptions.map((option) => ({
        value: option.color,
        image: option.image,
        inStock: option.inStock,
      }));
    } else if (attributeName === 'Size' && dependentAttributeValue) {
      const sizeOptions = this.variationService.getSizesForColor(
        variations,
        dependentAttributeValue
      );
      return sizeOptions.map((option) => ({
        value: option.size,
        inStock: option.inStock,
      }));
    }

    const optionMap = new Map<string, { image?: string; inStock: boolean }>();

    variations.forEach((v: any) => {
      const attr = v.attributes?.find(
        (attr: any) => attr?.name === attributeName
      );
      if (!attr) return;

      const matchesDependentAttribute =
        !dependentAttributeValue ||
        v.attributes?.some(
          (a: any) =>
            a.name !== attributeName && a.option === dependentAttributeValue
        );

      if (matchesDependentAttribute) {
        const isInStock = v.stock_status === 'instock';
        const currentValue = optionMap.get(attr.option);

        if (!currentValue || (!currentValue.inStock && isInStock)) {
          optionMap.set(attr.option, {
            inStock: isInStock,
          });
        }
      }
    });

    return Array.from(optionMap, ([value, data]) => ({
      value,
      image: data.image,
      inStock: data.inStock,
    }));
  }

  getSelectedVariation(
    product: any,
    selectedAttributes: { [key: string]: string | null }
  ) {
    const variations = product?.variations || [];
    if (!Array.isArray(variations) || !variations.length) {
      return null;
    }

    const variationAttributes = this.getVariationAttributes(product);
    if (!variationAttributes.length) {
      return null;
    }

    return this.variationService.findVariationByAttributes(
      variations,
      selectedAttributes
    );
  }

  getPriceInfo(
    product: any,
    selectedAttributes: { [key: string]: string | null }
  ): {
    price: string;
    regularPrice: string;
    isOnSale: boolean;
  } {
    if (!product) {
      return { price: '0', regularPrice: '0', isOnSale: false };
    }

    const normalizePrice = (value: any): string => {
      return value ? String(value).replace(/[^0-9.]/g, '') : '0';
    };

    if (product.type === 'simple') {
      const price = normalizePrice(product.price);
      const regularPrice = normalizePrice(product.regular_price || price);
      const salePrice = normalizePrice(product.sale_price);
      const isOnSale =
        (product.sale_price && salePrice !== regularPrice) ||
        (price !== regularPrice &&
          parseFloat(price) < parseFloat(regularPrice));

      return { price, regularPrice, isOnSale };
    }

    const selectedVariation = this.getSelectedVariation(
      product,
      selectedAttributes
    );
    if (
      selectedVariation &&
      this.allVariationAttributesSelected(product, selectedAttributes)
    ) {
      const price = normalizePrice(selectedVariation.price || product.price);
      const regularPrice = normalizePrice(
        selectedVariation.regular_price || price
      );
      const salePrice = normalizePrice(selectedVariation.sale_price);
      const isOnSale =
        (selectedVariation.sale_price && salePrice !== regularPrice) ||
        (price !== regularPrice &&
          parseFloat(price) < parseFloat(regularPrice));

      return { price, regularPrice, isOnSale };
    }

    const price = normalizePrice(product.price);
    const regularPrice = normalizePrice(product.regular_price || price);
    const salePrice = normalizePrice(product.sale_price);
    const isOnSale =
      (product.sale_price && salePrice !== regularPrice) ||
      (price !== regularPrice && parseFloat(price) < parseFloat(regularPrice));

    return { price, regularPrice, isOnSale };
  }

  isProductInStock(
    product: any,
    selectedAttributes: { [key: string]: string | null }
  ): boolean {
    if (!product) return false;

    if (product.type === 'simple') {
      if (!product.manage_stock) {
        return product.stock_status === 'instock';
      }
      return (
        product.stock_status === 'instock' &&
        (product.stock_quantity > 0 || product.backorders_allowed)
      );
    }

    const variations = product.variations || [];
    return variations.some((v: any) => v.stock_status === 'instock');
  }

  isCompletelyOutOfStock(product: any): boolean {
    if (!product) return true;
    if (product.type === 'simple') {
      return product.stock_status === 'outofstock';
    }
    return !product.variations?.some((v: any) => v.stock_status === 'instock');
  }

  allVariationAttributesSelected(
    product: any,
    selectedAttributes: { [key: string]: string | null }
  ): boolean {
    const variationAttributes = this.getVariationAttributes(product);
    return (
      variationAttributes.length === 0 ||
      variationAttributes.every(
        (attrName: string) => selectedAttributes[attrName] !== null
      )
    );
  }

  prepareCartProduct(
    product: any,
    selectedAttributes: { [key: string]: string | null },
    quantity: number
  ) {
    if (!product) return null;

    if (product.type === 'variable') {
      if (
        !this.allVariationAttributesSelected(product, selectedAttributes) ||
        !this.isProductInStock(product, selectedAttributes)
      ) {
        return null;
      }
      const selectedVariation: any = this.getSelectedVariation(
        product,
        selectedAttributes
      );
      return {
        id: selectedVariation?.id || product.id,
        price: this.getPriceInfo(product, selectedAttributes).price,
        quantity: quantity,
        name: product.name,
        variation_id: selectedVariation?.id
          ? parseInt(selectedVariation.id, 10)
          : 0,
        stock_status: selectedVariation?.stock_status || 'outofstock',
      };
    }

    if (product.stock_status !== 'instock') {
      return null;
    }

    return {
      id: product.id,
      price: this.getPriceInfo(product, selectedAttributes).price,
      quantity: quantity,
      name: product.name,
      variation_id: 0,
      stock_status: product.stock_status,
    };
  }

  setDefaultAttributes(product: any): { [key: string]: string | null } {
    const selectedAttributes: { [key: string]: string | null } = {};

    if (!product || product.type === 'simple') {
      return selectedAttributes;
    }

    const variations = product.variations || [];
    if (!Array.isArray(variations) || !variations.length) {
      return selectedAttributes;
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

      if (defaultAttr) {
        selectedOption = this.getVariationOptions(
          product,
          attrName,
          attrName === 'Size' ? selectedAttributes['Color'] : null
        ).find(
          (opt) =>
            opt.value.toLowerCase() === defaultAttr.option.toLowerCase() &&
            (opt.inStock || this.showOutOfStockVariations)
        );
      }

      if (!selectedOption) {
        selectedOption = this.getVariationOptions(
          product,
          attrName,
          attrName === 'Size' ? selectedAttributes['Color'] : null
        ).find((opt) => opt.inStock);
      }

      if (!selectedOption && this.showOutOfStockVariations) {
        selectedOption = this.getVariationOptions(
          product,
          attrName,
          attrName === 'Size' ? selectedAttributes['Color'] : null
        )[0];
      }

      if (selectedOption) {
        selectedAttributes[attrName] = selectedOption.value;
      }
    });

    return selectedAttributes;
  }

  private isDefaultVariationInStock(
    defaultAttributes: any[],
    variations: any[]
  ): boolean {
    const defaultAttrsMap = defaultAttributes.reduce((acc: any, attr: any) => {
      acc[attr.name] = attr.option;
      return acc;
    }, {});
    const defaultVariation = this.variationService.findVariationByAttributes(
      variations,
      defaultAttrsMap
    );
    return defaultVariation?.stock_status === 'instock';
  }
}
