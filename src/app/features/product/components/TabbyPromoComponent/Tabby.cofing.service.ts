import { Injectable, inject } from '@angular/core';
import { ConfigService } from '../../../../core/services/config.service';

@Injectable({
  providedIn: 'root'
})
export class TabbyConfigService {
  private configService = inject(ConfigService);
  
  getConfig() {
    // Get Tabby config from ConfigService
    const config = this.configService.currentConfig;
    if (config) {
      return {
        publicKey: config.tabbyPublicKey,
        merchantCode: config.tabbyMerchantCode
      };
    }
    return null;
  }
}
