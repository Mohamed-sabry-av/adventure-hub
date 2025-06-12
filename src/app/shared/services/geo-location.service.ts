import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map, from, switchMap } from 'rxjs';
import { ConfigService } from '../../core/services/config.service';
import { environment } from '../../../environments/environment';

// Add type definition for MaxMind's geoip2 library
declare global {
  interface Window {
    geoip2: {
      country: (
        success: (data: any) => void,
        error: (error: any) => void,
        options?: any
      ) => void;
    };
  }
}

export interface GeoLocationResponse {
  country_code: string;
  country_name?: string;
  city?: string;
  region?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GeoLocationService {
  private readonly MAXMIND_ACCOUNT_ID = '1151868';
  private readonly MAXMIND_LICENSE_KEY = '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';
  private readonly WC_API_URL = environment.apiUrl;
  private readonly WC_SITE_URL = 'https://adventures-hub.com'; // Base URL of your WooCommerce site
  private apiUrl: string = '';
  private configService = inject(ConfigService);

  constructor(private http: HttpClient) {
    // Get API URL from config
    this.configService.getConfig().subscribe(config => {
      if (config && config.apiUrl) {
        this.apiUrl = config.apiUrl;
      }
    });
  }

  getUserLocation(): Observable<GeoLocationResponse | null> {
    // Try to get from local storage first for returning visitors
    const savedLocation = localStorage.getItem('user_location');
    if (savedLocation) {
      try {
        const parsed = JSON.parse(savedLocation);
        return of(parsed);
      } catch (e) {
        
      }
    }
    
    // Use official WooCommerce geolocation API
    return this.http.get<any>(`${this.WC_SITE_URL}/wp-json/wc/v3/data/countries/current`).pipe(
      switchMap(response => {
        if (response && response.country_code) {
          const geoData: GeoLocationResponse = {
            country_code: response.country_code,
            country_name: response.country_name,
            city: response.city,
            region: response.region
          };
          
          // Save to localStorage for future use
          this.saveUserLocation(geoData);
          return of(geoData);
        }
        
        // Alternative fallback to WooCommerce specific endpoint
        return this.getLocationFromWooCommerceAPI();
      }),
      catchError(error => {
        
        // Fallback to our custom endpoint
        return this.getLocationFromCustomAPI();
      })
    );
  }
  
  private getLocationFromWooCommerceAPI(): Observable<GeoLocationResponse | null> {
    return this.http.get<any>(`${this.WC_SITE_URL}/wp-json/wc/store/v1/cart/extensions/geoip`).pipe(
      map(response => {
        if (response && response.country) {
          const geoData: GeoLocationResponse = {
            country_code: response.country,
            country_name: response.country_name || '',
          };
          
          this.saveUserLocation(geoData);
          return geoData;
        }
        return null;
      }),
      catchError(error => {
        
        // Fallback to our custom endpoint
        return this.getLocationFromCustomAPI();
      })
    );
  }
  
  private getLocationFromCustomAPI(): Observable<GeoLocationResponse | null> {
    return this.http.get<any>(`${this.WC_SITE_URL}/wp-json/api/geolocation`).pipe(
      switchMap(response => {
        if (response && response.country_code) {
          const geoData: GeoLocationResponse = {
            country_code: response.country_code,
            country_name: response.country_name,
            city: response.city,
            region: response.region
          };
          
          this.saveUserLocation(geoData);
          return of(geoData);
        }
        return this.getLocationFromMaxMindClientSide();
      }),
      catchError(error => {
        
        // Fallback to MaxMind's free database on client side
        return this.getLocationFromMaxMindClientSide();
      })
    );
  }
  
  private getLocationFromMaxMindClientSide(): Observable<GeoLocationResponse | null> {
    // Client-side fallback using MaxMind's JavaScript API
    // This only loads if the server-side method fails
    return from(new Promise<GeoLocationResponse | null>((resolve) => {
      // Check if the script is already loaded
      if (window.geoip2) {
        this.performClientSideGeoLookup(resolve);
        return;
      }
      
      // Load the MaxMind script dynamically
      const script = document.createElement('script');
      script.src = `https://geoip-js.com/js/apis/geoip2/v2.1/geoip2.js?auth=${this.MAXMIND_ACCOUNT_ID}_${this.MAXMIND_LICENSE_KEY}`;
      script.async = true;
      
      script.onload = () => {
        this.performClientSideGeoLookup(resolve);
      };
      
      script.onerror = () => {
        
        resolve(null);
      };
      
      document.head.appendChild(script);
    })).pipe(
      catchError(error => {
        
        return of(null);
      })
    );
  }
  
  private performClientSideGeoLookup(resolve: (value: GeoLocationResponse | null) => void): void {
    if (!window.geoip2) {
      resolve(null);
      return;
    }
    
    window.geoip2.country((response: any) => {
      const result: GeoLocationResponse = {
        country_code: response.country.iso_code,
        country_name: response.country.names.en,
        region: response.most_specific_subdivision?.names?.en
      };
      this.saveUserLocation(result);
      resolve(result);
    }, (error: any) => {
      
      resolve(null);
    });
  }

  // Save location to localStorage for future visits
  saveUserLocation(location: GeoLocationResponse): void {
    try {
      localStorage.setItem('user_location', JSON.stringify(location));
    } catch (e) {
      
    }
  }
} 