import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { ContentPagesService } from '../../service/content-pages.service';
import { SeoService } from '../../../../core/services/seo.service';
import { BaseContentPageComponent } from '../page-skeleton/base-content-page.component';
import { ContentPageComponent } from '../page-skeleton/content-page.component';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { NO_ERRORS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-contact-us',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ContentPageComponent],
  styleUrls: ['./contact-us.component.css'],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <!-- SEO Schema Data -->
    <ng-container *ngIf="schemaData">
      <script type="application/ld+json" [innerHTML]="schemaData"></script>
    </ng-container>
    
    <!-- Main Content -->
    <div class="contact-section">
      <div class="container">
        <div class="contact-wrapper">
          <!-- Contact Form -->
          <div class="contact-form-container">
            <h2>Send Us a message</h2>
            
            <form [formGroup]="contactForm" (ngSubmit)="onSubmit()">
              <div class="form-group">
                <label for="name">Name <span class="required">*</span></label>
                <input 
                  type="text" 
                  id="name" 
                  formControlName="name" 
                  placeholder="Enter your name"
                  [ngClass]="{'is-invalid': submitted && f['name'].errors}"
                >
                <div *ngIf="submitted && f['name'].errors" class="error-message">
                  <div *ngIf="f['name'].errors['required']">Name is required</div>
                </div>
              </div>
              
              <div class="form-group">
                <label for="email">Email <span class="required">*</span></label>
                <input 
                  type="email" 
                  id="email" 
                  formControlName="email" 
                  placeholder="Enter your email"
                  [ngClass]="{'is-invalid': submitted && f['email'].errors}"
                >
                <div *ngIf="submitted && f['email'].errors" class="error-message">
                  <div *ngIf="f['email'].errors['required']">Email is required</div>
                  <div *ngIf="f['email'].errors['email']">Please enter a valid email</div>
                </div>
              </div>
              
              <div class="form-group">
                <label for="phone">Phone</label>
                <input 
                  type="tel" 
                  id="phone" 
                  formControlName="phone" 
                  placeholder="Enter your phone number"
                >
              </div>
              
              <div class="form-group">
                <label for="subject">Subject <span class="required">*</span></label>
                <input 
                  type="text" 
                  id="subject" 
                  formControlName="subject" 
                  placeholder="Enter subject"
                  [ngClass]="{'is-invalid': submitted && f['subject'].errors}"
                >
                <div *ngIf="submitted && f['subject'].errors" class="error-message">
                  <div *ngIf="f['subject'].errors['required']">Subject is required</div>
                </div>
              </div>
              
              <div class="form-group">
                <label for="message">Your Message <span class="required">*</span></label>
                <textarea 
                  id="message" 
                  formControlName="message" 
                  rows="5" 
                  placeholder="Enter your message"
                  [ngClass]="{'is-invalid': submitted && f['message'].errors}"
                ></textarea>
                <div *ngIf="submitted && f['message'].errors" class="error-message">
                  <div *ngIf="f['message'].errors['required']">Message is required</div>
                </div>
              </div>
              
              <div class="form-actions">
                <button type="submit" class="submit-button">Send</button>
              </div>
              
              <div *ngIf="formSubmitted" class="form-success">
                Thank you for your message! We'll get back to you soon.
              </div>
            </form>
          </div>
          
          <!-- Contact Info -->
          <div class="google-map-container">
            <h2>Get in touch with us</h2>
            
            <div class="contact-info-content">
              <p>We love to hear from our customers, please send us your inquiry, and we will Get in touch with you in less than 12 hours</p>
              
              <h3 class="office-title">The Office</h3>
              
              <p class="office-address">
                Shams Business Center, Sharjah Media City free Zone, Al Messaned, Sharjah, UAE.
              </p>
              
              <h3 class="phone-title">Call: 050 460 6671</h3>
            </div>
            
            <!-- Google Map -->
            <div class="google-map">
              <iframe 
                [src]="mapEmbedUrl" 
                width="100%" 
                height="450" 
                style="border:0;" 
                allowfullscreen="" 
                loading="lazy" 
                referrerpolicy="no-referrer-when-downgrade">
              </iframe>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  providers: [
    {
      provide: BaseContentPageComponent,
      useExisting: ContactUsComponent
    }
  ]
})
export class ContactUsComponent extends BaseContentPageComponent {
  contactForm: FormGroup;
  submitted = false;
  formSubmitted = false;
  
  // Map data
  mapEmbedUrl: SafeResourceUrl;

  constructor(
    protected override contentPagesService: ContentPagesService,
    protected override seoService: SeoService,
    private formBuilder: FormBuilder,
    private sanitizer: DomSanitizer,
    protected override router: Router
  ) {
    super(contentPagesService, seoService, router);
    
    // Initialize form
    this.contactForm = this.formBuilder.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      subject: ['', Validators.required],
      message: ['', Validators.required]
    });
    
    // Default Google Map URL
    this.mapEmbedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3606.9258311609884!2d55.5236799154227!3d25.38662088380236!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f5dc4131292a3%3A0xb0d0def7dcead2a!2sShams%20Business%20Centre!5e0!3m2!1sen!2sus!4v1716308012345!5m2!1sen!2sus'
    );
  }

  // Getter for easy access to form fields
  get f() { 
    return this.contactForm.controls; 
  }
  
  onSubmit() {
    this.submitted = true;
    
    // Stop if form is invalid
    if (this.contactForm.invalid) {
      return;
    }
    
    // Here you would typically submit the form to a backend API

    // Show success message
    this.formSubmitted = true;
    
    // Reset form
    setTimeout(() => {
      this.contactForm.reset();
      this.submitted = false;
      this.formSubmitted = false;
    }, 5000);
  }

  protected override getPageContent(): Observable<any> {
    return this.contentPagesService.getContactUs();
  }

  protected override getDefaultSeoData(): { title: string; description: string } {
    return {
      title: 'Contact Us - Adventures HUB Sports Shop',
      description: 'Get in touch with Adventures HUB Sports Shop. Find our contact information, location details, and various ways to reach our customer support team.'
    };
  }
}

