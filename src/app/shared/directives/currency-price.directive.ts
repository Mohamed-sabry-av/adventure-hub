import { Directive, ElementRef, Input, OnInit, OnDestroy, HostBinding } from '@angular/core';
import { CurrencyService } from '../services/currency.service';
import { Subscription } from 'rxjs';

@Directive({
  selector: '[appCurrencyPrice]',
  standalone: true
})
export class CurrencyPriceDirective implements OnInit, OnDestroy {
  @Input('appCurrencyPrice') price: number = 0;
  @Input() originalPrice?: number; // Optional original price for showing discounts
  
  // Add attributes for styling and accessibility
  @HostBinding('attr.data-currency') currencyCode: string = 'AED';
  
  private currencySubscription: Subscription | null = null;
  private originalTextContent: string = '';
  
  constructor(
    private el: ElementRef,
    private currencyService: CurrencyService
  ) {}
  
  ngOnInit(): void {
    // Store original content in case we need to revert
    this.originalTextContent = this.el.nativeElement.textContent;
    
    // Subscribe to currency changes
    this.currencySubscription = this.currencyService.activeCurrency$.subscribe(currency => {
      this.currencyCode = currency.code;
      this.updatePrice();
    });
    
    // Initial update
    this.updatePrice();
    
    // Also listen for custom event (useful for non-Angular parts of the app)
    document.addEventListener('currency-changed', this.onCurrencyChanged.bind(this));
  }
  
  ngOnDestroy(): void {
    if (this.currencySubscription) {
      this.currencySubscription.unsubscribe();
    }
    document.removeEventListener('currency-changed', this.onCurrencyChanged.bind(this));
  }
  
  private onCurrencyChanged = () => {
    // Force an update when the custom event is triggered
    this.updatePrice();
  }
  
  private updatePrice(): void {
    if (typeof this.price !== 'number' || isNaN(this.price)) {
      console.warn('Invalid price value for currency directive:', this.price);
      return;
    }
    
    const currency = this.currencyService.getActiveCurrencyValue();
    const convertedPrice = this.currencyService.convertPrice(this.price);
    
    let formattedValue = convertedPrice.toFixed(currency.decimals);
    
    // Handle special case for UAE Dirham with SVG
    if (currency.code === 'AED') {
      this.createAEDPriceDisplay(convertedPrice);
    } else {
      // For all other currencies
      this.createStandardPriceDisplay(currency, convertedPrice);
    }
    
    // If we have an original price and it's different, add strikethrough
    if (this.originalPrice && this.originalPrice > this.price) {
      this.addOriginalPriceDisplay(this.originalPrice);
    }
  }
  
  private createAEDPriceDisplay(price: number): void {
    const formattedValue = price.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    
    // Create elements
    const container = document.createElement('span');
    container.className = 'flex items-center';
    
    // Create SVG image for AED
    const img = document.createElement('img');
    img.src = '/icons/UAE_Dirham_Symbol.svg';
    img.alt = 'AED';
    img.className = 'h-4 w-4 mr-1';
    
    // Create price text
    const priceText = document.createElement('span');
    priceText.textContent = formattedValue;
    
    // Assemble elements
    container.appendChild(img);
    container.appendChild(priceText);
    
    // Replace content
    this.el.nativeElement.textContent = '';
    this.el.nativeElement.appendChild(container);
  }
  
  private createStandardPriceDisplay(currency: any, price: number): void {
    const formattedValue = price.toFixed(currency.decimals);
    
    // Create the formatted price based on currency format
    let formattedHTML = currency.format
      .replace('%s', currency.symbol)
      .replace('%v', formattedValue);
    
    // Create elements
    const container = document.createElement('span');
    container.className = 'flex items-center';
    
    // Create symbol element
    const symbolSpan = document.createElement('span');
    symbolSpan.className = 'currency-symbol mr-1';
    symbolSpan.textContent = currency.symbol;
    
    // Create price text
    const priceText = document.createElement('span');
    priceText.textContent = formattedValue;
    
    // Assemble based on format
    if (currency.format.startsWith('%s')) {
      container.appendChild(symbolSpan);
      container.appendChild(priceText);
    } else {
      container.appendChild(priceText);
      container.appendChild(symbolSpan);
    }
    
    // Replace content
    this.el.nativeElement.textContent = '';
    this.el.nativeElement.appendChild(container);
  }
  
  private addOriginalPriceDisplay(originalPrice: number): void {
    const currency = this.currencyService.getActiveCurrencyValue();
    const convertedPrice = this.currencyService.convertPrice(originalPrice);
    const formattedOriginal = this.currencyService.formatPrice(convertedPrice);
    
    // Store current price display
    const currentDisplay = this.el.nativeElement.innerHTML;
    
    // Create container
    const container = document.createElement('span');
    container.className = 'flex items-center';
    
    // Create original price with strikethrough
    const originalEl = document.createElement('span');
    originalEl.style.textDecoration = 'line-through';
    originalEl.style.marginRight = '0.5em';
    originalEl.style.color = '#777';
    
    // For AED, create special display
    if (currency.code === 'AED') {
      const imgOriginal = document.createElement('img');
      imgOriginal.src = '/icons/UAE_Dirham_Symbol.svg';
      imgOriginal.alt = 'AED';
      imgOriginal.className = 'h-3 w-3 mr-1';
      
      const formattedValue = convertedPrice.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
      
      const priceText = document.createElement('span');
      priceText.textContent = formattedValue;
      
      originalEl.appendChild(imgOriginal);
      originalEl.appendChild(priceText);
    } else {
      // For other currencies
      originalEl.innerHTML = formattedOriginal;
    }
    
    // Clear and rebuild content
    this.el.nativeElement.innerHTML = '';
    container.appendChild(originalEl);
    
    // Create current price element and append HTML
    const currentEl = document.createElement('span');
    currentEl.style.fontWeight = 'bold';
    currentEl.innerHTML = currentDisplay;
    
    container.appendChild(currentEl);
    this.el.nativeElement.appendChild(container);
  }
} 