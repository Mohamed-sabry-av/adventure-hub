import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, map, catchError, switchMap } from 'rxjs';
import { GeoLocationService } from './geo-location.service';
import { ApiService } from '../../core/services/api.service';

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
  private readonly EXCHANGE_RATE_API_URL = 'https://latest.currency-api.pages.dev/v1/currencies/aed.json';

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
    private apiService: ApiService,
    private geoLocationService: GeoLocationService
  ) {
    this.initCurrencySettings();
  }

  initCurrencySettings(): void {
    // Always get fresh data with no caching

    // First fetch exchange rates to ensure we have the latest rates
    this.getExchangeRates().pipe(
      switchMap(rates => {
        console.log('Exchange rates loaded with', Object.keys(rates).length, 'currencies');
        
        // Then get available currencies
        return this.getAvailableCurrencies();
      }),
      switchMap(currencies => {
        // Update available currencies with the latest exchange rates
        const rates = this._exchangeRates$.value;
        
        // Only keep currencies that have valid exchange rates
        const validCurrencies = currencies.filter(currency => {
          if (rates[currency.code]) {
            currency.rate = rates[currency.code];
            return true;
          }
          return currency.code === 'AED'; // Always keep AED
        });
        
        this._availableCurrencies$.next(validCurrencies);
        console.log('Available currencies loaded with valid exchange rates:', validCurrencies.length);
        
        // Always get user location - might have changed since last visit
        return this.geoLocationService.getUserLocation();
      })
    ).subscribe({
      next: location => {
      if (!location) {
          console.log('No location detected, using default currency');
          // Set to AED if no location
          this.setActiveCurrency('AED');
        return;
      }
      
      console.log('Location detected:', location.country_code, location.country_name);
      // Store the detected country code
      this._geoLocationCountry$.next(location.country_code);
      // Set the appropriate currency based on location
      this.setCurrencyForCountry(location.country_code);
      },
      error: err => {
        console.error('Error initializing currency settings:', err);
        // Ensure we default to AED if there's an error
        this.setActiveCurrency('AED');
      }
    });
  }

  /**
   * Special method to select International (USD) currency
   */
  setInternationalCurrency(): void {
    this.setActiveCurrency('USD');
  }

  /**
   * Check if we have an International option in the available currencies
   * This method no longer adds fallback data, only returns existing currencies
   */
  private ensureInternationalOption(currencies: CurrencyInfo[]): CurrencyInfo[] {
    // We no longer add fake/fallback data
    return currencies;
  }

  /**
   * Get all available currencies from WooCommerce
   */
  getAvailableCurrencies(): Observable<CurrencyInfo[]> {
    // No caching - fetch directly from API
    // Fetch currencies data from WooCommerce API
    return this.apiService.getExternalRequest<any>(`${this.WC_SITE_URL}/wp-json/wc/v3/data/currencies`, { withCredentials: false }).pipe(
      map(response => {
        if (!response) {
          console.error('No response from currencies API');
          throw new Error('Failed to fetch currencies from API');
        }
        
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
        
        // If EGP is present, update its symbol to L.E
        const egpCurrency = currencies.find(c => c.code === 'EGP');
        if (egpCurrency) {
          egpCurrency.symbol = 'L.E';
          egpCurrency.format = '%s %v';
        }
        
        return currencies;
      }),
      catchError(err => {
        console.error('Error fetching currencies:', err);
        throw new Error('Failed to fetch currencies from API');
      }),
      switchMap(currencies => {
        // After getting currencies, fetch exchange rates
        return this.getExchangeRates().pipe(
          map(rates => {
            // Only include currencies with valid exchange rates
            return currencies
              .filter(currency => rates[currency.code] || currency.code === 'AED')
              .map(currency => ({
              ...currency,
                rate: rates[currency.code] || (currency.code === 'AED' ? 1 : 0)
            }));
          })
        );
      })
    );
  }

  /**
   * Previously provided fallback currencies, now removed to only use real API data
   */
  private getExtendedFallbackCurrencies(): CurrencyInfo[] {
    // Return only the base currency - no fallback data
    return [{
        code: 'AED',
        symbol: 'د.إ',
        name: 'UAE Dirham',
        rate: 1,
        decimals: 2,
        format: '%v %s'
    }];
  }

  /**
   * Get exchange rates from a public exchange rate API
   * Uses open.er-api.com which provides free exchange rate data
   */
  getExchangeRates(): Observable<{[code: string]: number}> {
    // No caching - only get fresh data from API
    console.log('Fetching exchange rates from', this.EXCHANGE_RATE_API_URL);
    return this.apiService.getExternalRequest<any>(this.EXCHANGE_RATE_API_URL, { withCredentials: true }).pipe(
      map(response => {
        if (!response || !response.rates) {
          console.error('Invalid response from exchange rate API:', response);
          throw new Error('Invalid response from exchange rate API');
        }
        
        console.log('Received exchange rates for', Object.keys(response.rates).length, 'currencies');
        
        const rates: {[code: string]: number} = { 
          [this.DEFAULT_CURRENCY.code]: 1 // Base currency always has rate of 1
        };
        
        // The API returns rates relative to AED (our base currency)
        Object.assign(rates, response.rates);
        
        this._exchangeRates$.next(rates);
        return rates;
      }),
      catchError(err => {
        console.error('Error fetching exchange rates:', err);
        throw new Error('Failed to fetch exchange rates from API');
      })
    );
  }

  /**
   * Set the active currency based on country code
   */
  setCurrencyForCountry(countryCode: string): void {
    console.log('Setting currency for country:', countryCode);
    
    // Special case for international users
    if (countryCode === 'INTL') {
      this.applyAndNotifyCurrencyChange('USD');
      return;
    }
    
    // Get currency mappings from mapping
    const directCurrencyCode = this.commonCountryCurrencyMap[countryCode];
    if (directCurrencyCode) {
      console.log('Direct currency mapping found:', countryCode, '->', directCurrencyCode);
      this.applyAndNotifyCurrencyChange(directCurrencyCode);
      return;
    }

    // If no direct mapping, try WooCommerce API
    this.apiService.getExternalRequest<any>(`${this.WC_SITE_URL}/wp-json/wc/v3/data/countries`).pipe(
      map(countries => {
        // Find the country by code
        const country = countries.find((c: any) => c.code === countryCode);
        // Get the currency code for this country
        const currencyCode = country?.currency_code || this.DEFAULT_CURRENCY.code;
        return currencyCode;
      }),
      catchError(err => {
        console.error('Error getting country data:', err);
        // If API fails, use default
        return of(this.DEFAULT_CURRENCY.code);
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
    
    // Get current exchange rates
    const exchangeRates = this._exchangeRates$.value;

    // If currency not found in available currencies or no exchange rates available, default to AED
    if (!currency || Object.keys(exchangeRates).length === 0) {
      console.warn(`Currency ${currencyCode} not found in available currencies or no exchange rates available, using AED`);
      
      // If we're already requesting AED, use the default
      if (currencyCode === 'AED') {
        this._activeCurrency$.next(this.DEFAULT_CURRENCY);
        
        // Dispatch event
        const event = new CustomEvent('currency-changed', { 
          detail: { 
            currency: this.DEFAULT_CURRENCY.code,
            symbol: this.DEFAULT_CURRENCY.symbol,
            rate: this.DEFAULT_CURRENCY.rate
          } 
        });
        document.dispatchEvent(event);
        return;
      } else {
        // Otherwise, try again with AED
        this.applyAndNotifyCurrencyChange('AED');
        return;
      }
    }
    
    // Use a deep clone to avoid modifying the original
    const activeCurrency = {...currency};
    
    // Update exchange rate from current rates if available
    if (exchangeRates && exchangeRates[activeCurrency.code]) {
      activeCurrency.rate = exchangeRates[activeCurrency.code];
      console.log('Using live exchange rate for', activeCurrency.code, 'of', activeCurrency.rate);
    } else {
      // If no valid exchange rate, switch to AED
      console.warn('No exchange rate available for', activeCurrency.code, 'switching to AED');
      this.applyAndNotifyCurrencyChange('AED');
      return;
    }
    
    console.log('Applying currency change to:', activeCurrency.code, activeCurrency.symbol, 'rate:', activeCurrency.rate);
    
    // Set as active currency
    this._activeCurrency$.next(activeCurrency);
    
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
    const exchangeRates = this._exchangeRates$.value;
    let currency = currencies.find(c => c.code === currencyCode);
    
    // If currency not found or we have no exchange rates, default to AED
    if (!currency) {
      console.warn(`Currency ${currencyCode} not found in available currencies`);
      if (currencyCode !== 'AED') {
        this.setActiveCurrency('AED');
      }
      return;
    }
    
      // Ensure we're using the latest exchange rate from the API
      if (exchangeRates && exchangeRates[currency.code]) {
        // Clone the currency object to avoid modifying the original
        currency = {...currency};
        
        // Update the rate using the latest data from the API
        currency.rate = exchangeRates[currency.code];
        console.log(`Updated exchange rate for ${currency.code} to ${currency.rate}`);
      
      this._activeCurrency$.next(currency);
      
      // Alert other parts of the application
      const event = new CustomEvent('currency-changed', { 
        detail: { 
          currency: currency.code,
          symbol: currency.symbol,
          rate: currency.rate
        } 
      });
      document.dispatchEvent(event);
    } else {
      console.warn(`No current exchange rate found for ${currency.code}, switching to AED`);
      if (currencyCode !== 'AED') {
        this.setActiveCurrency('AED');
      } else {
        // If we're already trying to set AED but have no exchange rates, just use default rate of 1
        const aedCurrency = {...this.DEFAULT_CURRENCY};
        this._activeCurrency$.next(aedCurrency);
        
        const event = new CustomEvent('currency-changed', { 
          detail: { 
            currency: aedCurrency.code,
            symbol: aedCurrency.symbol,
            rate: aedCurrency.rate
          } 
        });
        document.dispatchEvent(event);
      }
    }
  }

  /**
   * Convert price from base currency (AED) to active currency
   */
  convertPrice(priceInBaseCurrency: number): number {
    const currency = this._activeCurrency$.value;
    
    // If currency is AED (base currency), no conversion needed
    if (currency.code === 'AED') {
      return priceInBaseCurrency;
    }
    
    // Check if we have a valid exchange rate
    if (!currency.rate || currency.rate <= 0) {
      console.warn('Invalid exchange rate for', currency.code, '- switching to AED');
      this.setActiveCurrency('AED');
      return priceInBaseCurrency;
    }
    
    // For non-AED currencies, use the exchange rate from the active currency
    // The rates are relative to AED (1 AED = X units of target currency)
    const convertedPrice = priceInBaseCurrency * currency.rate;
    
    return convertedPrice;
  }

  /**
   * Format price according to currency format
   */
  formatPrice(price: number): string {
    const currency = this._activeCurrency$.value;
    const formattedValue = price.toFixed(currency.decimals);
    
    // Use proper English symbols for all currencies
    let symbol = currency.symbol;
    if (currency.code === 'EGP') {
      symbol = 'L.E';
    }
    
    return currency.format
      .replace('%s', symbol)
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
  
  /**
   * Get the country name for a given currency code
   * Used for displaying country names in the currency selector
   */
  getCountryForCurrency(currencyCode: string): string {
    // Special case for International (USD)
    if (currencyCode === 'USD') {
      return 'International';
    }
    
    // Create a reverse mapping of currency to country
    const currencyToCountry: Record<string, string> = {};
    
    // Populate the mapping
    for (const [countryCode, currency] of Object.entries(this.commonCountryCurrencyMap)) {
      if (currency === currencyCode) {
        // Get country name from country code
        switch (countryCode) {
          case 'AE': return 'United Arab Emirates';
          case 'OM': return 'Oman';
          case 'QA': return 'Qatar';
          case 'SA': return 'Saudi Arabia';
          case 'BH': return 'Bahrain';
          case 'KW': return 'Kuwait';
          case 'JO': return 'Jordan';
          case 'IQ': return 'Iraq';
          case 'IL': return 'Israel';
          case 'LB': return 'Lebanon';
          case 'PS': return 'Palestine';
          case 'SY': return 'Syria';
          case 'YE': return 'Yemen';
          case 'EG': return 'Egypt';
          case 'MA': return 'Morocco';
          case 'TN': return 'Tunisia';
          case 'DZ': return 'Algeria';
          case 'LY': return 'Libya';
          case 'NG': return 'Nigeria';
          case 'ZA': return 'South Africa';
          case 'GH': return 'Ghana';
          case 'KE': return 'Kenya';
          case 'TZ': return 'Tanzania';
          case 'ET': return 'Ethiopia';
          case 'UG': return 'Uganda';
          case 'US': return 'United States';
          case 'CA': return 'Canada';
          case 'MX': return 'Mexico';
          case 'BR': return 'Brazil';
          case 'AR': return 'Argentina';
          case 'CL': return 'Chile';
          case 'CO': return 'Colombia';
          case 'PE': return 'Peru';
          case 'CN': return 'China';
          case 'JP': return 'Japan';
          case 'KR': return 'South Korea';
          case 'IN': return 'India';
          case 'ID': return 'Indonesia';
          case 'PK': return 'Pakistan';
          case 'BD': return 'Bangladesh';
          case 'PH': return 'Philippines';
          case 'VN': return 'Vietnam';
          case 'TH': return 'Thailand';
          case 'MY': return 'Malaysia';
          case 'SG': return 'Singapore';
          case 'HK': return 'Hong Kong';
          case 'GB': return 'United Kingdom';
          case 'CH': return 'Switzerland';
          case 'SE': return 'Sweden';
          case 'NO': return 'Norway';
          case 'DK': return 'Denmark';
          case 'PL': return 'Poland';
          case 'RU': return 'Russia';
          case 'TR': return 'Turkey';
          case 'CZ': return 'Czech Republic';
          case 'HU': return 'Hungary';
          case 'RO': return 'Romania';
          case 'DE': return 'Germany';
          case 'FR': return 'France';
          case 'IT': return 'Italy';
          case 'ES': return 'Spain';
          case 'NL': return 'Netherlands';
          case 'BE': return 'Belgium';
          case 'AT': return 'Austria';
          case 'IE': return 'Ireland';
          case 'PT': return 'Portugal';
          case 'GR': return 'Greece';
          case 'FI': return 'Finland';
          case 'AU': return 'Australia';
          case 'NZ': return 'New Zealand';
          default: return countryCode;
        }
      }
    }
    
    // If not found in mapping, return currency name
    const currency = this._availableCurrencies$.value.find(c => c.code === currencyCode);
    return currency?.name || currencyCode;
  }

  /**
   * Get a URL for a country flag based on currency code
   */
  getCountryFlagUrl(currencyCode: string): string {
    // Get ISO country code for this currency
    let countryCode = '';
    
    // Special mapping for common currencies
    switch(currencyCode) {
      case 'USD': 
        countryCode = 'US'; 
        break;
      case 'EUR': 
        countryCode = 'EU'; // European Union
        break;
      case 'GBP': 
        countryCode = 'GB'; 
        break;
      case 'AED': 
        countryCode = 'AE'; 
        break;
      case 'AUD': 
        countryCode = 'AU'; 
        break;
      case 'CAD': 
        countryCode = 'CA'; 
        break;
      case 'JPY': 
        countryCode = 'JP'; 
        break;
      case 'CHF': 
        countryCode = 'CH'; 
        break;
      case 'CNY': 
        countryCode = 'CN'; 
        break;
      case 'INR': 
        countryCode = 'IN'; 
        break;
      case 'SGD': 
        countryCode = 'SG'; 
        break;
      default:
        // Try to find a country that uses this currency
        for (const [code, currency] of Object.entries(this.commonCountryCurrencyMap)) {
          if (currency === currencyCode) {
            countryCode = code;
            break;
          }
        }
        // Fallback
        if (!countryCode) {
          countryCode = 'UN'; // United Nations flag as fallback
        }
    }
    
    // Use the simpler flag URL format
    return `https://flagcdn.com/${countryCode.toLowerCase()}`;
  }

  /**
   * Get country code for a given currency code
   * Used by the currency selector component for flag display
   */
  getCountryCodeForCurrency(currencyCode: string): string {
    // Try to find a country that uses this currency
    for (const [code, currency] of Object.entries(this.commonCountryCurrencyMap)) {
      if (currency === currencyCode) {
        return code.toLowerCase();
      }
    }
    
    // Fallback
    return 'un'; // United Nations flag as fallback
  }
} 