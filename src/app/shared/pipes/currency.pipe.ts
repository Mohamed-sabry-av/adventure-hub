import { Pipe, PipeTransform, OnDestroy } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CurrencyService } from '../services/currency.service';
import { Subscription, combineLatest } from 'rxjs';

@Pipe({
  name: 'currencySvg',
  standalone: true,
  pure: false // Make it impure so it updates when currency changes
})
export class CurrencySvgPipe implements PipeTransform, OnDestroy {
  private subscriptions: Subscription[] = [];
  private currentCurrencyCode: string = 'AED';
  private currentCurrencySymbol: string = 'د.إ';
  private currentRate: number = 1;
  private cachedResults: Map<string|number, SafeHtml> = new Map();
  
  constructor(
    private sanitizer: DomSanitizer,
    private currencyService: CurrencyService
  ) {
    // Subscribe to currency changes
    this.subscriptions.push(
      this.currencyService.activeCurrency$.subscribe(currency => {
        // Clear cache when currency changes
        this.cachedResults.clear();
        
        this.currentCurrencyCode = currency.code;
        this.currentCurrencySymbol = currency.symbol;
        this.currentRate = currency.rate;
        
        console.log('Currency pipe updated to:', currency.code, currency.symbol, currency.rate);
      })
    );
    
    // Also subscribe to exchange rate changes
    this.subscriptions.push(
      this.currencyService.exchangeRates$.subscribe(rates => {
        const currentCurrency = this.currencyService.getActiveCurrencyValue();
        if (rates && rates[currentCurrency.code]) {
          // If the rate has changed, update and clear cache
          if (this.currentRate !== rates[currentCurrency.code]) {
            this.currentRate = rates[currentCurrency.code];
            this.cachedResults.clear();
            console.log('Exchange rate updated for', currentCurrency.code, 'to', this.currentRate);
          }
        }
      })
    );
    
    // Also listen for the custom event
    document.addEventListener('currency-changed', this.onCurrencyChanged);
  }
  
  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    document.removeEventListener('currency-changed', this.onCurrencyChanged);
  }
  
  private onCurrencyChanged = () => {
    // Clear cache when currency changes via custom event
    this.cachedResults.clear();
  }

  transform(value: string | number | null | undefined, isOldPrice: boolean = false): SafeHtml {
    if (value == null || value === '' || value === 'Unavailable') {
      return this.sanitizer.bypassSecurityTrustHtml('<span>Unavailable</span>');
    }

    // Check if we have a cached result
    const cacheKey = `${value}_${this.currentCurrencyCode}_${isOldPrice}_${this.currentRate}`;
    if (this.cachedResults.has(cacheKey)) {
      return this.cachedResults.get(cacheKey)!;
    }

    // تحويل القيمة لرقم
    let numericValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numericValue)) {
      const result = this.sanitizer.bypassSecurityTrustHtml('<span>Invalid Price</span>');
      this.cachedResults.set(cacheKey, result);
      return result;
    }

    // تحويل السعر باستخدام خدمة العملات
    const convertedPrice = this.currencyService.convertPrice(numericValue);
    
    // للتحقق من صحة التحويل
    console.log(`Pipe converting: ${numericValue} AED → ${convertedPrice} ${this.currentCurrencyCode} (rate: ${this.currentRate})`);
    
    // Format price with thousand separators using western/English numerals for all currencies
    const formattedValue = convertedPrice.toLocaleString('en-US', {
      minimumFractionDigits: this.currentCurrencyCode === 'AED' ? 0 : 2,
      maximumFractionDigits: this.currentCurrencyCode === 'AED' ? 0 : 2,
      useGrouping: true,
      numberingSystem: 'latn' // Force Latin (Western) numerals for all currencies
    });

    let html;
    
    // For old prices, don't show the currency symbol - always display just the number
    if (isOldPrice) {
      html = `<span class="old-price">${formattedValue}</span>`;
    }
    // عرض مختلف للدرهم الإماراتي
    else if (this.currentCurrencyCode === 'AED') {
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