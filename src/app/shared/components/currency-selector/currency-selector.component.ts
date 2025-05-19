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
         (mouseenter)="isMobile ? null : showDropdown()" 
         (mouseleave)="isMobile ? null : hideDropdown()" 
         [ngClass]="{'mobile-view': isMobile}">
      <div class="selected-currency" (click)="isMobile ? toggleDropdown() : null">
        <span *ngIf="(activeCurrency$ | async)?.code !== 'AED'">{{ (activeCurrency$ | async)?.code }}</span>
        <span *ngIf="(activeCurrency$ | async)?.code === 'AED'" class="aed-with-svg">
          <img src="/icons/UAE_Dirham_Symbol.svg" alt="AED" class="h-4 w-4 mr-1">
          AED
        </span>
        <span class="dropdown-arrow" [ngClass]="{'open': dropdownOpen}">▼</span>
      </div>
      
      <div class="currency-dropdown" *ngIf="dropdownOpen" @slideDown>
        <div 
          *ngFor="let currency of prioritizedCurrencies$ | async" 
          class="currency-option"
          [ngClass]="{'active': (activeCurrency$ | async)?.code === currency.code}"
          (click)="selectCurrency(currency.code)">
          <span class="currency-symbol" [innerHTML]="getCurrencySymbol(currency)"></span>
          <span class="currency-code">{{ currency.code }}</span>
          <span class="currency-name">{{ currency.name }}</span>
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
      display: grid;
      grid-template-columns: 30px 50px 1fr auto;
      align-items: center;
      transition: background-color 0.2s;
    }
    
    .currency-option:hover {
      background-color: #f7fafc;
    }
    
    .currency-option.active {
      background-color: #f0f9ff;
    }
    
    .currency-symbol {
      font-weight: bold;
      text-align: center;
    }
    
    .aed-with-svg {
      display: flex;
      align-items: center;
    }
    
    .currency-code {
      font-weight: 500;
    }
    
    .currency-name {
      color: #4a5568;
      font-size: 0.85em;
    }
    
    .detected-tag {
      font-size: 0.7em;
      color: #22c55e;
      margin-left: 6px;
      font-weight: 600;
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
    private currencyService: CurrencyService,
    private sanitizer: DomSanitizer
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
    
    // Mark and sort currencies: detected first, then active, then alphabetically
    return currencies.map(currency => ({
      ...currency,
      isDetected: currency.code === detectedCurrencyCode
    }))
    .sort((a, b) => {
      // Detected currency first
      if (a.isDetected && !b.isDetected) return -1;
      if (!a.isDetected && b.isDetected) return 1;
      
      // Active currency second
      const activeCurrency = this.currencyService.getActiveCurrencyValue();
      if (a.code === activeCurrency.code && b.code !== activeCurrency.code) return -1;
      if (a.code !== activeCurrency.code && b.code === activeCurrency.code) return 1;
      
      // Then sort by name
      return a.code.localeCompare(b.code);
    });
  }
  
  showDropdown(): void {
    this.dropdownOpen = true;
  }
  
  hideDropdown(): void {
    this.hoverTimeoutId = setTimeout(() => {
      this.dropdownOpen = false;
    }, 300);
  }

  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
  }
  
  selectCurrency(currencyCode: string): void {
    this.currencyService.setActiveCurrency(currencyCode);
    this.dropdownOpen = false;
  }
} 