import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { AsyncPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { CurrencyService, CurrencyInfo } from '../../services/currency.service';
import { Observable, map } from 'rxjs';
import { animate, style, transition, trigger } from '@angular/animations';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-currency-selector',
  standalone: true,
  imports: [NgIf, NgFor, NgClass, AsyncPipe],
  template: `
    <div class="currency-selector" 
         (mouseenter)="showDropdown()" 
         (mouseleave)="hideDropdown()" 
         [ngClass]="{'mobile-view': isMobile}">
      <div class="selected-currency" (click)="isMobile ? toggleDropdown() : null">
        <ng-container *ngIf="activeCurrency$ | async as activeCurrency">
          <span class="country-flag-display">
            <img [src]="'https://flagcdn.com/' + getCountryCode(activeCurrency.code)+ '.svg'" width="20" height="15" class="flag-icon h-4 w-5 mr-1">
            {{ currencyService.getCountryForCurrency(activeCurrency.code) }}
          </span>
        </ng-container>
        <span class="dropdown-arrow" [ngClass]="{'open': dropdownOpen}">▼</span>
      </div>
      
      <div class="currency-dropdown" *ngIf="dropdownOpen" @slideDown
           (mouseenter)="cancelHideDropdown()" 
           (mouseleave)="hideDropdown()">
        <!-- International Option always first with special styling -->
        <div 
          class="currency-option international-option"
          [ngClass]="{'active': (activeCurrency$ | async)?.code === 'USD'}"
          (click)="selectCurrency('USD')">
          <span class="country-flag">
            <img src="https://flagcdn.com/us.svg" width="20" height="15" class="flag-icon h-4 w-5 mr-1">
          </span>
          <span class="country-name">International ($)</span>
        </div>
        
        <div class="divider my-1 border-t border-gray-200"></div>
        
        <!-- Regular currency options -->
        <div 
          *ngFor="let currency of prioritizedCurrencies$ | async" 
          class="currency-option"
          [ngClass]="{'active': (activeCurrency$ | async)?.code === currency.code}"
          (click)="selectCurrency(currency.code)">
          <span class="country-flag">
            <img [src]="'https://flagcdn.com/' + getCountryCode(currency.code)+ '.svg'" width="20" height="15" class="flag-icon h-4 w-5 mr-1">
          </span>
          <span class="country-name">{{ currencyService.getCountryForCurrency(currency.code) }}</span>
          <span *ngIf="currency.isDetected" class="detected-tag">(Detected)</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .currency-selector {
      position: relative;
      display: inline-block;
    }
    
    .selected-currency {
      display: flex;
      align-items: center;
      padding: 5px 10px;
      color: white;
      font-weight: 600;
      cursor: pointer;
      user-select: none;
      min-width: 60px;
      position: relative;
      transition: all 0.3s ease;
    }
    
    .selected-currency:after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 2px;
      background-color: white;
      transform: scaleX(0);
      transform-origin: right;
      transition: transform 0.3s ease;
    }
    
    .currency-selector:not(.mobile-view):hover .selected-currency:after {
      transform: scaleX(1);
      transform-origin: left;
    }
    
    .dropdown-arrow {
      margin-left: 6px;
      font-size: 10px;
      transition: transform 0.2s;
    }
    
    .dropdown-arrow.open {
      transform: rotate(180deg);
    }
    
    .currency-dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      width: 260px;
      background: white;
      border-radius: 4px;
      margin-top: 0.5rem;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      max-height: 400px;
      overflow-y: auto;
    }
    
    .currency-option {
      padding: 8px 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      transition: background-color 0.2s;
    }
    
    .currency-option:hover {
      background-color: #f7fafc;
    }
    
    .currency-option.active {
      background-color: #f0f9ff;
    }
    
    .country-flag {
      margin-right: 10px;
    }
    
    .flag-icon {
      border-radius: 2px;
      box-shadow: 0 0 1px rgba(0,0,0,0.2);
    }
    
    .country-flag-display {
      display: flex;
      align-items: center;
    }
    
    .country-name {
      flex-grow: 1;
      font-weight: 500;
    }
    
    .detected-tag {
      font-size: 0.7em;
      color: #22c55e;
      margin-left: 6px;
      font-weight: 600;
    }

    .international-option {
      background-color: #f7f9fc;
      font-weight: 600;
    }
    
    .international-option:hover {
      background-color: #e6f0ff;
    }
    
    .divider {
      height: 1px;
      margin: 4px 0;
    }

    /* Mobile-specific styles */
    .mobile-view {
      width: 100%;
    }

    .mobile-view .selected-currency {
      padding: 10px 16px;
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      color: #000;
      font-weight: 500;
      font-size: 16px;
    }

    .mobile-view .selected-currency:after {
      display: none;
    }

    .mobile-view .currency-dropdown {
      position: static;
      width: 100%;
      margin-top: 0;
      border-radius: 0;
      box-shadow: none;
      max-height: 300px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    }
  `],
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0, transform: 'translateY(-10px)' }))
      ])
    ])
  ]
})
export class CurrencySelectorComponent implements OnInit, OnDestroy {
  @Input() isMobile: boolean = false;

  activeCurrency$: Observable<CurrencyInfo>;
  availableCurrencies$: Observable<CurrencyInfo[]>;
  // New observable to sort and mark detected currency
  prioritizedCurrencies$: Observable<(CurrencyInfo & { isDetected?: boolean })[]>;
  
  dropdownOpen = false;
  private userCountryCode: string | null = null;
  private hoverTimeoutId: any = null;
  
  constructor(
    private sanitizer: DomSanitizer,
    public currencyService: CurrencyService
  ) {
    this.activeCurrency$ = this.currencyService.activeCurrency$;
    this.availableCurrencies$ = this.currencyService.availableCurrencies$;
    
    // Create a transformed stream that prioritizes the detected currency
    this.prioritizedCurrencies$ = this.currencyService.geoLocationCountry$.pipe(
      map(countryCode => {
        this.userCountryCode = countryCode;
        return this.sortCurrenciesByDetectedCountry();
      })
    );
  }
  
  ngOnInit(): void {
    // Initial sort without relying on the stream
    this.prioritizedCurrencies$ = this.availableCurrencies$.pipe(
      map(currencies => this.sortCurrenciesByDetectedCountry())
    );
  }
  
  ngOnDestroy(): void {
    if (this.hoverTimeoutId) {
      clearTimeout(this.hoverTimeoutId);
    }
  }
  
  getCurrencySymbol(currency: CurrencyInfo): string {
    if (currency.code === 'AED') {
      return `<img src="/icons/UAE_Dirham_Symbol.svg" alt="AED" class="h-4 w-4">`;
    }
    return currency.symbol;
  }
  
  private sortCurrenciesByDetectedCountry(): (CurrencyInfo & { isDetected?: boolean })[] {
    const currencies = this.currencyService.getAvailableCurrenciesValue();
    const detectedCurrencyCode = this.currencyService.getCurrencyForCountry(this.userCountryCode);
    
    // Mark and sort currencies: detected first, then active, then USD, then alphabetically
    return currencies.map(currency => ({
      ...currency,
      isDetected: currency.code === detectedCurrencyCode,
      // Mark USD/International separately
      isInternational: currency.code === 'USD'
    }))
    .sort((a, b) => {
      // Detected currency first
      if (a.isDetected && !b.isDetected) return -1;
      if (!a.isDetected && b.isDetected) return 1;
      
      // Active currency second
      const activeCurrency = this.currencyService.getActiveCurrencyValue();
      if (a.code === activeCurrency.code && b.code !== activeCurrency.code) return -1;
      if (a.code !== activeCurrency.code && b.code === activeCurrency.code) return 1;
      
      // USD (International) third - give it higher priority
      if (a.isInternational && !b.isInternational) return -1;
      if (!a.isInternational && b.isInternational) return 1;
      
      // Then sort by name
      return a.code.localeCompare(b.code);
    });
  }
  
  showDropdown(): void {
    if (this.isMobile) return;
    this.dropdownOpen = true;
  }
  
  hideDropdown(): void {
    if (this.isMobile) return;
    if (this.hoverTimeoutId) {
      clearTimeout(this.hoverTimeoutId);
    }
    this.hoverTimeoutId = setTimeout(() => {
      this.dropdownOpen = false;
    }, 800);
  }

  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
  }
  
  selectCurrency(currencyCode: string): void {
    this.currencyService.setActiveCurrency(currencyCode);
    this.dropdownOpen = false;
  }

  getCountryFlag(code: string | undefined): string {
    // Handle undefined case
    const currencyCode = code || 'AED'; // Default to AED if undefined
    return this.sanitizer.bypassSecurityTrustUrl(this.currencyService.getCountryFlagUrl(currencyCode)).toString();
  }

  getCountryCode(code: string): string {
    // Get ISO country code for this currency
    let countryCode = '';
    
    // Special mapping for common currencies
    switch(code) {
      case 'USD': 
        countryCode = 'us'; 
        break;
      case 'EUR': 
        countryCode = 'eu'; // European Union
        break;
      case 'GBP': 
        countryCode = 'gb'; 
        break;
      case 'AED': 
        countryCode = 'ae'; 
        break;
      case 'AUD': 
        countryCode = 'au'; 
        break;
      case 'CAD': 
        countryCode = 'ca'; 
        break;
      case 'JPY': 
        countryCode = 'jp'; 
        break;
      case 'CHF': 
        countryCode = 'ch'; 
        break;
      case 'CNY': 
        countryCode = 'cn'; 
        break;
      case 'INR': 
        countryCode = 'in'; 
        break;
      case 'SGD': 
        countryCode = 'sg'; 
        break;
      default:
        // Try to find a country that uses this currency in the service
        countryCode = this.currencyService.getCountryCodeForCurrency(code);
    }
    
    return countryCode.toLowerCase();
  }

  cancelHideDropdown(): void {
    if (this.hoverTimeoutId) {
      clearTimeout(this.hoverTimeoutId);
      this.hoverTimeoutId = null;
    }
  }
} 