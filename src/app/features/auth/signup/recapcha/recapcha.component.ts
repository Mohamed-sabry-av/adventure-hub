import { Component, EventEmitter, Input, Output, AfterViewInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-recapcha',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="recaptcha-container">
      <div 
        *ngIf="isBrowser"
        class="g-recaptcha" 
        [attr.data-sitekey]="siteKey" 
        data-callback="onRecaptchaSuccess">
      </div>
    </div>
  `,
  styleUrls: ['./recapcha.component.css'],
})
export class RecapchaComponent implements AfterViewInit {
  @Input() siteKey: string = '6LfvcForAAAAADIIAlTLPI3k1x2-25tG26HlrhxI'; // Site Key من Google
  @Output() recaptchaSuccess = new EventEmitter<string>(); // لإرسال الـ token للكومبوننت الأب
  recaptchaToken: string | null = null;
  isBrowser: boolean = false;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngAfterViewInit() {
    if (this.isBrowser) {
      // نشغل الكود في المتصفح بس
      this.loadRecaptchaScript().then(() => {
        // نحدد الـ callback ديناميكيًا بعد تحميل السكربت
        (window as any).onRecaptchaSuccess = this.onRecaptchaSuccess.bind(this);
      }).catch(err => {
        
      });
    }
  }

  private loadRecaptchaScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).grecaptcha) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://www.google.com/recaptcha/api.js';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('reCAPTCHA script failed to load'));
      document.head.appendChild(script);
    });
  }

  onRecaptchaSuccess(token: string) {
    this.recaptchaToken = token;
    this.recaptchaSuccess.emit(token);
  }

  resetRecaptcha() {
    if (this.isBrowser && (window as any).grecaptcha) {
      this.recaptchaToken = null;
      (window as any).grecaptcha.reset();
    }
  }
}
