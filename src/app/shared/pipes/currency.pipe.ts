import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'currencySvg',
  standalone: true,
  pure: false // Make it impure so it updates when value changes
})
export class CurrencySvgPipe implements PipeTransform {
  private cachedResults: Map<string|number, SafeHtml> = new Map();
  
  constructor(
    private sanitizer: DomSanitizer
  ) {}

  transform(value: string | number | null | undefined, isOldPrice: boolean = false): SafeHtml {
    if (value == null || value === '' || value === 'Unavailable') {
      return this.sanitizer.bypassSecurityTrustHtml('<span>Unavailable</span>');
    }

    // Check if we have a cached result
    const cacheKey = `${value}_${isOldPrice}`;
    if (this.cachedResults.has(cacheKey)) {
      return this.cachedResults.get(cacheKey)!;
    }

    // Convert value to number
    let numericValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numericValue)) {
      const result = this.sanitizer.bypassSecurityTrustHtml('<span>Invalid Price</span>');
      this.cachedResults.set(cacheKey, result);
      return result;
    }
    
    // Format price with thousand separators using English numerals
    const formattedValue = numericValue.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      useGrouping: true,
      numberingSystem: 'latn' // Force Latin (Western) numerals
    });

    let html;
    
    // For old prices, don't show the currency symbol
    if (isOldPrice) {
      html = `<span class="old-price">${formattedValue}</span>`;
    }
    // Display UAE Dirham with SVG icon
    else {
      html = `
      <span class="flex items-center">
        <img src="/icons/UAE_Dirham_Symbol.svg" alt="UAE Dirham" class="h-4 w-4 mr-1">
        ${formattedValue}
      </span>
    `;
    }

    const result = this.sanitizer.bypassSecurityTrustHtml(html);
    this.cachedResults.set(cacheKey, result);
    return result;
  }
}