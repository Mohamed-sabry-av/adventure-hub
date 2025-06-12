import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ConfigService, AppConfig } from './config.service';

describe('ConfigService', () => {
  let service: ConfigService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ConfigService]
    });
    service = TestBed.inject(ConfigService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load configuration from server', () => {
    const mockConfig: AppConfig = {
      consumerKey: 'test-key',
      consumerSecret: 'test-secret',
      apiUrl: 'http://test-api.com',
      stripePublishableKey: 'pk_test',
      stripeSecretKey: 'sk_test',
      stripeWebhookSecret: 'whsec_test',
      tabbyPublicKey: 'tabby_test',
      tabbyMerchantCode: 'AE',
      gtmId: 'GTM-TEST',
      fbAppId: 'fb-test',
      googleClientId: 'google-test',
      klaviyoPublicKey: 'klaviyo-test'
    };

    // The service should make a request in its constructor
    const req = httpMock.expectOne('/api/config');
    expect(req.request.method).toBe('GET');
    
    // Respond with mock data
    req.flush(mockConfig);
    
    // Service should have the config data
    service.getConfig().subscribe(config => {
      expect(config).toEqual(mockConfig);
    });
  });

  it('should handle errors when loading config', () => {
    // Spy on console.error
    spyOn(console, 'error');
    
    // The service should make a request in its constructor
    const req = httpMock.expectOne('/api/config');
    
    // Respond with an error
    req.error(new ErrorEvent('Network error'));
    
    // Service should handle the error
    service.loading$.subscribe(loading => {
      expect(loading).toBe(false);
    });
    
    // Console.error should be called
    expect(console.error).toHaveBeenCalled();
  });
}); 