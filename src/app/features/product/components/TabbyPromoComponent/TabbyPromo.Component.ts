import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
declare class TabbyPromo {
  constructor(options: {
    selector: string;
    currency: string;
    price: string;
    lang?: string;
    source?: string;
    publicKey: string;
    merchantCode: string;
    shouldInheritBg?: boolean;
  });
}
@Component({
  selector: 'app-tabby-promo',
  template: `
    <div [id]="uniqueId" class="tabby-promo-container"></div>
  `,
  styles: [`
    .tabby-promo-container {
      width: 100%;
      max-width: 100%;
      margin: 0.5rem 0;
      display: flex;
      justify-content: center;
    }
    @media (min-width: 768px) {
      .tabby-promo-container {
        max-width: 400px;
      }
    }
  `],
  standalone: true,
  imports: [CommonModule],
})
export class TabbyPromoComponent implements OnInit, OnChanges {
  @Input() price: string = '0.00';
  @Input() currency: string = 'AED';
  @Input() lang: string = 'en';
  @Input() source: string = 'product';
  @Input() publicKey: string = '';
  @Input() merchantCode: string = '';
  @Input() shouldInheritBg: boolean = true;
  uniqueId: string = `tabby-promo-${Math.random().toString(36).substr(2, 9)}`;
  ngOnInit() {
    this.loadTabbyScript();
  }
  ngOnChanges(changes: SimpleChanges) {
    if (changes['price'] || changes['currency'] || changes['lang'] || changes['source'] || changes['publicKey'] || changes['merchantCode']) {
      this.initializeTabbyPromo();
    }
  }
  private loadTabbyScript() {
    if (typeof TabbyPromo !== 'undefined') {
      this.initializeTabbyPromo();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.tabby.ai/tabby-promo.js';
    script.async = true;
    script.onload = () => this.initializeTabbyPromo();
    script.onerror = () => console.error('Failed to load Tabby Promo script');
    document.body.appendChild(script);
  }
  private initializeTabbyPromo() {
    if (typeof TabbyPromo === 'undefined') {
      return;
    }
    new TabbyPromo({
      selector: `#${this.uniqueId}`,
      currency: this.currency,
      price: this.price,
      lang: this.lang,
      source: this.source,
      publicKey: this.publicKey,
      merchantCode: this.merchantCode,
      shouldInheritBg: this.shouldInheritBg,
    });
  }
}
