import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, map, catchError, switchMap } from 'rxjs';
import { GeoLocationService } from './geo-location.service';

export interface CurrencyInfo {
  code: string;       // AED, USD, etc
  symbol: string;     // $, €, £, etc
  name: string;       // UAE Dirham, US Dollar, etc
  rate: number;       // Exchange rate against base currency (usually 1 for base)
  decimals: number;   // Number of decimal places
  format: string;     // Format string (e.g., '%s%v' for $10)
}

@Injectable({
  providedIn: 'root'
})
export class CurrencyService {
  private readonly WC_SITE_URL = 'https://adventures-hub.com';
  private readonly DEFAULT_CURRENCY: CurrencyInfo = {
    code: 'AED',
    symbol: 'د.إ',
    name: 'UAE Dirham',
    rate: 1,
    decimals: 2,
    format: '%v %s'
  };
  
  // Exchange Rate API base URL
  private readonly EXCHANGE_RATE_API_URL = 'https://open.er-api.com/v6/latest/AED';

  private _activeCurrency$ = new BehaviorSubject<CurrencyInfo>(this.DEFAULT_CURRENCY);
  private _availableCurrencies$ = new BehaviorSubject<CurrencyInfo[]>([this.DEFAULT_CURRENCY]);
  private _exchangeRates$ = new BehaviorSubject<{[code: string]: number}>({});
  private _geoLocationCountry$ = new BehaviorSubject<string | null>(null);

  // Expose as Observables for components to subscribe to
  public activeCurrency$ = this._activeCurrency$.asObservable();
  public availableCurrencies$ = this._availableCurrencies$.asObservable();
  public exchangeRates$ = this._exchangeRates$.asObservable();
  public geoLocationCountry$ = this._geoLocationCountry$.asObservable();

  // Common country to currency mappings
  private readonly commonCountryCurrencyMap: {[countryCode: string]: string} = {
    // Middle East & North Africa
    'AE': 'AED', // United Arab Emirates
    'OM': 'OMR', // Oman
    'QA': 'QAR', // Qatar
    'SA': 'SAR', // Saudi Arabia
    'BH': 'BHD', // Bahrain
    'KW': 'KWD', // Kuwait
    'JO': 'JOD', // Jordan
    'IQ': 'IQD', // Iraq
    'IL': 'ILS', // Israel
    'LB': 'LBP', // Lebanon
    'PS': 'ILS', // Palestine (uses Israeli Shekel)
    'SY': 'SYP', // Syria
    'YE': 'YER', // Yemen
    'EG': 'EGP', // Egypt
    'MA': 'MAD', // Morocco
    'TN': 'TND', // Tunisia
    'DZ': 'DZD', // Algeria
    'LY': 'LYD', // Libya
    
    // Africa
    'NG': 'NGN', // Nigeria
    'ZA': 'ZAR', // South Africa
    'GH': 'GHS', // Ghana
    'KE': 'KES', // Kenya
    'TZ': 'TZS', // Tanzania
    'ET': 'ETB', // Ethiopia
    'UG': 'UGX', // Uganda
    
    // Americas
    'US': 'USD', // United States
    'CA': 'CAD', // Canada
    'MX': 'MXN', // Mexico
    'BR': 'BRL', // Brazil
    'AR': 'ARS', // Argentina
    'CL': 'CLP', // Chile
    'CO': 'COP', // Colombia
    'PE': 'PEN', // Peru
    
    // Asia
    'CN': 'CNY', // China
    'JP': 'JPY', // Japan
    'KR': 'KRW', // South Korea
    'IN': 'INR', // India
    'ID': 'IDR', // Indonesia
    'PK': 'PKR', // Pakistan
    'BD': 'BDT', // Bangladesh
    'PH': 'PHP', // Philippines
    'VN': 'VND', // Vietnam
    'TH': 'THB', // Thailand
    'MY': 'MYR', // Malaysia
    'SG': 'SGD', // Singapore
    'HK': 'HKD', // Hong Kong
    
    // Europe
    'GB': 'GBP', // United Kingdom
    'CH': 'CHF', // Switzerland
    'SE': 'SEK', // Sweden
    'NO': 'NOK', // Norway
    'DK': 'DKK', // Denmark
    'PL': 'PLN', // Poland
    'RU': 'RUB', // Russia
    'TR': 'TRY', // Turkey
    'CZ': 'CZK', // Czech Republic
    'HU': 'HUF', // Hungary
    'RO': 'RON', // Romania
    
    // European Union (Euro)
    'DE': 'EUR', // Germany
    'FR': 'EUR', // France
    'IT': 'EUR', // Italy
    'ES': 'EUR', // Spain
    'NL': 'EUR', // Netherlands
    'BE': 'EUR', // Belgium
    'AT': 'EUR', // Austria
    'IE': 'EUR', // Ireland
    'PT': 'EUR', // Portugal
    'GR': 'EUR', // Greece
    'FI': 'EUR', // Finland
    
    // Oceania
    'AU': 'AUD', // Australia
    'NZ': 'NZD', // New Zealand
  };

  constructor(
    private http: HttpClient,
    private geoLocationService: GeoLocationService
  ) {
    this.initCurrencySettings();
  }

  initCurrencySettings(): void {
    // First try to load from localStorage if available
    const cachedUserCurrency = localStorage.getItem('user_currency');
    if (cachedUserCurrency) {
      try {
        const currency = JSON.parse(cachedUserCurrency);
        this._activeCurrency$.next(currency);
        console.log('Loaded currency from cache:', currency.code);
      } catch (e) {
        console.error('Error parsing cached user currency:', e);
      }
    }

    // Always detect location to ensure we have the most up-to-date country
    this.getAvailableCurrencies().pipe(
      switchMap(currencies => {
        this._availableCurrencies$.next(currencies);
        console.log('Available currencies loaded:', currencies.length);
        
        // Always get user location - might have changed since last visit
        return this.geoLocationService.getUserLocation();
      })
    ).subscribe(location => {
      if (!location) {
        console.log('No location detected, using default or cached currency');
        return;
      }
      
      console.log('Location detected:', location.country_code, location.country_name);
      // Store the detected country code
      this._geoLocationCountry$.next(location.country_code);
      // Set the appropriate currency based on location
      this.setCurrencyForCountry(location.country_code);
    });
  }

  /**
   * Get all available currencies from WooCommerce
   */
  getAvailableCurrencies(): Observable<CurrencyInfo[]> {
    // First check localStorage for cached currencies
    const cachedCurrencies = localStorage.getItem('available_currencies');
    if (cachedCurrencies) {
      try {
        const currencies = JSON.parse(cachedCurrencies);
        if (Array.isArray(currencies) && currencies.length > 0) {
          return of(currencies);
        }
      } catch (e) {
        console.error('Error parsing cached currencies:', e);
      }
    }
    
    // Fetch from API if not in cache
    return this.http.get<any>(`${this.WC_SITE_URL}/wp-json/wc/v3/data/currencies`).pipe(
      map(response => {
        if (!response) return this.getExtendedFallbackCurrencies();
        
        // Transform the response to our CurrencyInfo format
        const currencies = Object.keys(response).map(code => {
          const curr = response[code];
          return {
            code,
            symbol: curr.symbol,
            name: curr.name,
            rate: 1, // Default rate, will be updated from exchange rates API
            decimals: parseInt(curr.decimals || '2', 10),
            format: curr.format || '%s%v'
          };
        });
        
        // Cache the results
        try {
          localStorage.setItem('available_currencies', JSON.stringify(currencies));
        } catch (e) {
          console.error('Error caching currencies:', e);
        }
        
        return currencies.length ? currencies : this.getExtendedFallbackCurrencies();
      }),
      catchError(err => {
        console.error('Error fetching currencies:', err);
        return of(this.getExtendedFallbackCurrencies());
      }),
      switchMap(currencies => {
        // After getting currencies, fetch exchange rates
        return this.getExchangeRates().pipe(
          map(rates => {
            // Apply exchange rates to currencies
            return currencies.map(currency => ({
              ...currency,
              rate: rates[currency.code] || 1
            }));
          })
        );
      })
    );
  }

  /**
   * Get an extended list of fallback currencies
   * This provides a much larger set of currencies when the API fails
   */
  private getExtendedFallbackCurrencies(): CurrencyInfo[] {
    return [
      // Middle East
      {
        code: 'AED',
        symbol: 'د.إ',
        name: 'UAE Dirham',
        rate: 1,
        decimals: 2,
        format: '%v %s'
      },
      {
        code: 'SAR',
        symbol: '﷼',
        name: 'Saudi Riyal',
        rate: 1.03,
        decimals: 2,
        format: '%v %s'
      },
      {
        code: 'QAR',
        symbol: 'ر.ق',
        name: 'Qatari Riyal',
        rate: 1,
        decimals: 2,
        format: '%v %s'
      },
      {
        code: 'OMR',
        symbol: 'ر.ع.',
        name: 'Omani Rial',
        rate: 0.1,
        decimals: 3,
        format: '%v %s'
      },
      {
        code: 'BHD',
        symbol: 'د.ب',
        name: 'Bahraini Dinar',
        rate: 0.1,
        decimals: 3,
        format: '%v %s'
      },
      {
        code: 'KWD',
        symbol: 'د.ك',
        name: 'Kuwaiti Dinar',
        rate: 0.083,
        decimals: 3,
        format: '%v %s'
      },
      {
        code: 'EGP',
        symbol: 'ج.م',
        name: 'Egyptian Pound',
        rate: 12.73,
        decimals: 2,
        format: '%v %s'
      },
      
      // Major Global Currencies
      {
        code: 'USD',
        symbol: '$',
        name: 'US Dollar',
        rate: 0.27,
        decimals: 2,
        format: '%s%v'
      },
      {
        code: 'EUR',
        symbol: '€',
        name: 'Euro',
        rate: 0.25,
        decimals: 2,
        format: '%s%v'
      },
      {
        code: 'GBP',
        symbol: '£',
        name: 'British Pound',
        rate: 0.21,
        decimals: 2,
        format: '%s%v'
      },
      {
        code: 'JPY',
        symbol: '¥',
        name: 'Japanese Yen',
        rate: 41.39,
        decimals: 0,
        format: '%s%v'
      },
      {
        code: 'CAD',
        symbol: 'C$',
        name: 'Canadian Dollar',
        rate: 0.37,
        decimals: 2,
        format: '%s%v'
      },
      {
        code: 'AUD',
        symbol: 'A$',
        name: 'Australian Dollar',
        rate: 0.40,
        decimals: 2,
        format: '%s%v'
      },
      {
        code: 'CHF',
        symbol: 'CHF',
        name: 'Swiss Franc',
        rate: 0.24,
        decimals: 2,
        format: '%s %v'
      },
      
      // Asian Currencies
      {
        code: 'CNY',
        symbol: '¥',
        name: 'Chinese Yuan',
        rate: 1.96,
        decimals: 2,
        format: '%s%v'
      },
      {
        code: 'INR',
        symbol: '₹',
        name: 'Indian Rupee',
        rate: 22.91,
        decimals: 2,
        format: '%s%v'
      },
      {
        code: 'PKR',
        symbol: '₨',
        name: 'Pakistani Rupee',
        rate: 75.38,
        decimals: 2,
        format: '%s%v'
      },
      {
        code: 'SGD',
        symbol: 'S$',
        name: 'Singapore Dollar',
        rate: 0.37,
        decimals: 2,
        format: '%s%v'
      },
      {
        code: 'MYR',
        symbol: 'RM',
        name: 'Malaysian Ringgit',
        rate: 1.25,
        decimals: 2,
        format: '%s%v'
      },
      {
        code: 'THB',
        symbol: '฿',
        name: 'Thai Baht',
        rate: 9.55,
        decimals: 2,
        format: '%s%v'
      },
      {
        code: 'IDR',
        symbol: 'Rp',
        name: 'Indonesian Rupiah',
        rate: 4302.66,
        decimals: 0,
        format: '%s%v'
      },
      {
        code: 'PHP',
        symbol: '₱',
        name: 'Philippine Peso',
        rate: 15.39,
        decimals: 2,
        format: '%s%v'
      },
      
      // European Currencies
      {
        code: 'SEK',
        symbol: 'kr',
        name: 'Swedish Krona',
        rate: 2.89,
        decimals: 2,
        format: '%v %s'
      },
      {
        code: 'NOK',
        symbol: 'kr',
        name: 'Norwegian Krone',
        rate: 2.89,
        decimals: 2,
        format: '%v %s'
      },
      {
        code: 'DKK',
        symbol: 'kr',
        name: 'Danish Krone',
        rate: 1.87,
        decimals: 2,
        format: '%v %s'
      },
      {
        code: 'RUB',
        symbol: '₽',
        name: 'Russian Ruble',
        rate: 25.15,
        decimals: 2,
        format: '%v %s'
      },
      {
        code: 'TRY',
        symbol: '₺',
        name: 'Turkish Lira',
        rate: 8.91,
        decimals: 2,
        format: '%v %s'
      },
      {
        code: 'PLN',
        symbol: 'zł',
        name: 'Polish Złoty',
        rate: 1.07,
        decimals: 2,
        format: '%v %s'
      },
      
      // American Currencies
      {
        code: 'BRL',
        symbol: 'R$',
        name: 'Brazilian Real',
        rate: 1.53,
        decimals: 2,
        format: '%s%v'
      },
      {
        code: 'MXN',
        symbol: '$',
        name: 'Mexican Peso',
        rate: 4.61,
        decimals: 2,
        format: '%s%v'
      },
      {
        code: 'ARS',
        symbol: '$',
        name: 'Argentine Peso',
        rate: 242.26,
        decimals: 2,
        format: '%s%v'
      },
      
      // African Currencies
      {
        code: 'ZAR',
        symbol: 'R',
        name: 'South African Rand',
        rate: 5.17,
        decimals: 2,
        format: '%s%v'
      },
      {
        code: 'NGN',
        symbol: '₦',
        name: 'Nigerian Naira',
        rate: 419.37,
        decimals: 2,
        format: '%s%v'
      }
    ];
  }

  /**
   * Get exchange rates from a public exchange rate API
   * Uses open.er-api.com which provides free exchange rate data
   */
  getExchangeRates(): Observable<{[code: string]: number}> {
    // First check localStorage for cached rates
    const cachedRates = localStorage.getItem('exchange_rates');
    const cacheTime = localStorage.getItem('exchange_rates_time');
    const now = Date.now();
    
    // Use cache if less than 24 hours old
    if (cachedRates && cacheTime && (now - parseInt(cacheTime, 10)) < 24 * 60 * 60 * 1000) {
      try {
        const rates = JSON.parse(cachedRates);
        this._exchangeRates$.next(rates);
        return of(rates);
      } catch (e) {
        console.error('Error parsing cached rates:', e);
      }
    }
    
    // Fetch from Exchange Rate API if not in cache or cache is old
    return this.http.get<any>(this.EXCHANGE_RATE_API_URL).pipe(
      map(response => {
        const rates: {[code: string]: number} = { 
          [this.DEFAULT_CURRENCY.code]: 1 // Base currency always has rate of 1
        };
        
        if (response && response.rates) {
          // The API returns rates relative to AED (our base currency)
          Object.assign(rates, response.rates);
        }
        
        // Cache the results
        try {
          localStorage.setItem('exchange_rates', JSON.stringify(rates));
          localStorage.setItem('exchange_rates_time', now.toString());
        } catch (e) {
          console.error('Error caching rates:', e);
        }
        
        this._exchangeRates$.next(rates);
        return rates;
      }),
      catchError(err => {
        console.error('Error fetching exchange rates:', err);
        
        // Fallback to common static rates if API fails
        const fallbackRates = {
          'AED': 1,
          'USD': 0.27,
          'EUR': 0.25,
          'GBP': 0.21,
          'JPY': 41.39,
          'INR': 22.91,
          'CNY': 1.96,
          'AUD': 0.40,
          'CAD': 0.37,
          'CHF': 0.24,
          'SAR': 1.03,
          'QAR': 1,
          'OMR': 0.1,
          'KWD': 0.083,
          'BHD': 0.1,
          'EGP': 12.73,
          'PKR': 75.38,
          'RUB': 25.15,
          'TRY': 8.91
        };
        
        this._exchangeRates$.next(fallbackRates);
        return of(fallbackRates);
      })
    );
  }

  /**
   * Set the active currency based on country code
   */
  setCurrencyForCountry(countryCode: string): void {
    console.log('Setting currency for country:', countryCode);
    
    // Get currency mappings from our API or use fallback
    const directCurrencyCode = this.commonCountryCurrencyMap[countryCode];
    if (directCurrencyCode) {
      console.log('Direct currency mapping found:', countryCode, '->', directCurrencyCode);
      this.applyAndNotifyCurrencyChange(directCurrencyCode);
      return;
    }

    // If no direct mapping, try WooCommerce API
    this.http.get<any>(`${this.WC_SITE_URL}/wp-json/wc/v3/data/countries`).pipe(
      map(countries => {
        // Find the country by code
        const country = countries.find((c: any) => c.code === countryCode);
        // Get the currency code for this country
        const currencyCode = country?.currency_code || this.commonCountryCurrencyMap[countryCode] || this.DEFAULT_CURRENCY.code;
        return currencyCode;
      }),
      catchError(() => {
        // If API fails, use our fallback mapping
        const currencyCode = this.commonCountryCurrencyMap[countryCode] || this.DEFAULT_CURRENCY.code;
        return of(currencyCode);
      })
    ).subscribe(currencyCode => {
      this.applyAndNotifyCurrencyChange(currencyCode);
    });
  }

  /**
   * Helper method to apply currency change and dispatch event
   */
  private applyAndNotifyCurrencyChange(currencyCode: string): void {
    // Find this currency in our available currencies
    const currencies = this._availableCurrencies$.value;
    const currency = currencies.find(c => c.code === currencyCode);

    // If currency not found in available currencies, add it from our extended fallback list
    if (!currency) {
      const extendedFallbacks = this.getExtendedFallbackCurrencies();
      const fallbackCurrency = extendedFallbacks.find(c => c.code === currencyCode);
      
      if (fallbackCurrency) {
        // Add this currency to our available currencies
        const updatedCurrencies = [...currencies, fallbackCurrency];
        this._availableCurrencies$.next(updatedCurrencies);
        
        console.log('Added new currency to available list:', fallbackCurrency.code, fallbackCurrency.name);
        this._activeCurrency$.next(fallbackCurrency);
        localStorage.setItem('user_currency', JSON.stringify(fallbackCurrency));
        
        // Dispatch event
        const event = new CustomEvent('currency-changed', { 
          detail: { 
            currency: fallbackCurrency.code,
            symbol: fallbackCurrency.symbol,
            rate: fallbackCurrency.rate
          } 
        });
        document.dispatchEvent(event);
        return;
      }
    }
    
    const activeCurrency = currency || this.DEFAULT_CURRENCY;
    console.log('Applying currency change to:', activeCurrency.code, activeCurrency.symbol);
    
    // Set as active currency
    this._activeCurrency$.next(activeCurrency);
    
    // Save user's currency preference
    localStorage.setItem('user_currency', JSON.stringify(activeCurrency));
    
    // Dispatch an event for any non-Angular parts of the application
    const event = new CustomEvent('currency-changed', { 
      detail: { 
        currency: activeCurrency.code,
        symbol: activeCurrency.symbol,
        rate: activeCurrency.rate
      } 
    });
    document.dispatchEvent(event);
  }

  /**
   * Set active currency manually (e.g., when user selects from dropdown)
   */
  setActiveCurrency(currencyCode: string): void {
    const currencies = this._availableCurrencies$.value;
    const currency = currencies.find(c => c.code === currencyCode);
    
    if (currency) {
      this._activeCurrency$.next(currency);
      localStorage.setItem('user_currency', JSON.stringify(currency));
    } else {
      console.warn(`Currency ${currencyCode} not found in available currencies`);
    }
  }

  /**
   * Convert price from base currency to active currency
   */
  convertPrice(priceInBaseCurrency: number): number {
    const currency = this._activeCurrency$.value;
    return priceInBaseCurrency * currency.rate;
  }

  /**
   * Format price according to currency format
   */
  formatPrice(price: number): string {
    const currency = this._activeCurrency$.value;
    const formattedValue = price.toFixed(currency.decimals);
    
    return currency.format
      .replace('%s', currency.symbol)
      .replace('%v', formattedValue);
  }

  /**
   * Convert and format price in one step
   */
  formatConvertedPrice(priceInBaseCurrency: number): string {
    const convertedPrice = this.convertPrice(priceInBaseCurrency);
    return this.formatPrice(convertedPrice);
  }

  /**
   * Get currency code for a given country code
   * Used by the currency selector component
   */
  getCurrencyForCountry(countryCode: string | null): string {
    if (!countryCode) return this.DEFAULT_CURRENCY.code;
    
    // First check direct mapping
    const directMapping = this.commonCountryCurrencyMap[countryCode];
    if (directMapping) return directMapping;
    
    // Otherwise return default
    return this.DEFAULT_CURRENCY.code;
  }

  /**
   * Get the current active currency value
   * Used by the currency selector component
   */
  getActiveCurrencyValue(): CurrencyInfo {
    return this._activeCurrency$.value;
  }
  
  /**
   * Get the current available currencies value
   * Used by the currency selector component
   */
  getAvailableCurrenciesValue(): CurrencyInfo[] {
    return this._availableCurrencies$.value;
  }
} 