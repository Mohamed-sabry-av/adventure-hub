import { Pipe, PipeTransform, OnDestroy } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CurrencyService } from '../services/currency.service';
import { Subscription } from 'rxjs';

@Pipe({
  name: 'currencySvg',
  standalone: true,
  pure: false // Make it impure so it updates when currency changes
})
export class CurrencySvgPipe implements PipeTransform, OnDestroy {
  private currencySubscription: Subscription;
  private currentCurrencyCode: string = 'AED';
  private currentCurrencySymbol: string = 'د.إ';
  private currentRate: number = 1;
  private cachedResults: Map<string|number, SafeHtml> = new Map();
  
  constructor(
    private sanitizer: DomSanitizer,
    private currencyService: CurrencyService
  ) {
    // Subscribe to currency changes
    this.currencySubscription = this.currencyService.activeCurrency$.subscribe(currency => {
      // Clear cache when currency changes
      this.cachedResults.clear();
      
      this.currentCurrencyCode = currency.code;
      this.currentCurrencySymbol = currency.symbol;
      this.currentRate = currency.rate;
      
      console.log('Currency pipe updated to:', currency.code, currency.symbol, currency.rate);
    });
    
    // Also listen for the custom event
    document.addEventListener('currency-changed', this.onCurrencyChanged);
  }
  
  ngOnDestroy(): void {
    if (this.currencySubscription) {
      this.currencySubscription.unsubscribe();
    }
    document.removeEventListener('currency-changed', this.onCurrencyChanged);
  }
  
  private onCurrencyChanged = () => {
    // Clear cache when currency changes via custom event
    this.cachedResults.clear();
  }

  transform(value: string | number | null | undefined): SafeHtml {
    if (value == null || value === '' || value === 'Unavailable') {
      return this.sanitizer.bypassSecurityTrustHtml('<span>Unavailable</span>');
    }

    // Check if we have a cached result
    const cacheKey = `${value}_${this.currentCurrencyCode}`;
    if (this.cachedResults.has(cacheKey)) {
      return this.cachedResults.get(cacheKey)!;
    }

    // تحويل القيمة لنص منسق بفاصلة آلاف
    let numericValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numericValue)) {
      const result = this.sanitizer.bypassSecurityTrustHtml('<span>Invalid Price</span>');
      this.cachedResults.set(cacheKey, result);
      return result;
    }

    // تحويل السعر حسب سعر الصرف
    numericValue = numericValue * this.currentRate;
    
    // تنسيق السعر بفاصلة آلاف مع مراعاة العملات المختلفة
    const formattedValue = numericValue.toLocaleString('en-US', {
      minimumFractionDigits: this.currentCurrencyCode === 'AED' ? 0 : 2,
      maximumFractionDigits: this.currentCurrencyCode === 'AED' ? 0 : 2
    });

    let html;
    
    // عرض مختلف للدرهم الإماراتي
    if (this.currentCurrencyCode === 'AED') {
      html = `
      <span class="flex items-center">
        <img src="/icons/UAE_Dirham_Symbol.svg" alt="UAE Dirham" class="h-4 w-4 mr-1">
        ${formattedValue}
      </span>
    `;
    } else {
      html = `
        <span class="flex items-center">
          <span class="currency-symbol mr-1">${this.currentCurrencySymbol}</span>
          ${formattedValue}
        </span>
      `;
    }

    const result = this.sanitizer.bypassSecurityTrustHtml(html);
    this.cachedResults.set(cacheKey, result);
    return result;
  }
}