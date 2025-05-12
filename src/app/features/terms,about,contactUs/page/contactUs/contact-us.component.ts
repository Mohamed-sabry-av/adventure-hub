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

@Component({
  selector: 'app-contact-us',
  standalone: true,
  imports: [CommonModule, ContentPageComponent, FormsModule, ReactiveFormsModule],
  template: `
    <!-- SEO Schema Data -->
    <ng-container *ngIf="schemaData">
      <script type="application/ld+json" [innerHTML]="schemaData"></script>
    </ng-container>
    
    <app-content-page
      [pageData]="pageData"
      [schemaData]="schemaData"
      [isLoading]="isLoading"
      pageClass="contact-us-page"
    ></app-content-page>
    
    <!-- Contact Form and Map Section -->
    <div class="contact-section" *ngIf="!isLoading && pageData">
      <div class="container">
        <div class="contact-wrapper">
          <!-- Contact Form -->
          <div class="contact-form-container">
            <h2>{{ contactFormTitle }}</h2>
            
            <!-- Display the parsed form as is -->
            <div *ngIf="parsedForm" [innerHTML]="parsedForm"></div>
            
            <!-- Fallback form if parsing fails -->
            <form *ngIf="!parsedForm" [formGroup]="contactForm" (ngSubmit)="onSubmit()">
              <div class="form-group">
                <label for="name">Your Name</label>
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
                <label for="email">Your Email</label>
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
                <label for="subject">Subject</label>
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
                <label for="message">Your Message</label>
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
                <button type="submit" class="submit-button">Send Message</button>
              </div>
              
              <div *ngIf="formSubmitted" class="form-success">
                Thank you for your message! We'll get back to you soon.
              </div>
            </form>
          </div>
          
          <!-- Contact Info -->
          <div class="google-map-container">
            <h2>{{ contactInfoTitle }}</h2>
            
            <!-- Contact Info Content -->
            <div class="contact-info-content" *ngIf="contactInfoContent" [innerHTML]="contactInfoContent"></div>
            
            <!-- Google Map - for when map coordinates are extracted -->
            <div *ngIf="showMap" class="google-map">
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
  styles: [`
    .contact-section {
      margin: 40px 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    .contact-wrapper {
      display: flex;
      flex-wrap: wrap;
      gap: 30px;
    }
    
    .contact-form-container,
    .google-map-container {
      flex: 1;
      min-width: 300px;
    }
    
    h2 {
      font-size: 1.8rem;
      color: #2c3e50;
      margin-bottom: 20px;
      border-bottom: 2px solid #f0f0f0;
      padding-bottom: 10px;
    }
    
    .form-group {
      margin-bottom: 20px;
    }
    
    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: #2c3e50;
    }
    
    input, textarea {
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-family: inherit;
      font-size: 16px;
      transition: border-color 0.3s ease;
    }
    
    input:focus, textarea:focus {
      outline: none;
      border-color: #3498db;
      box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
    }
    
    .is-invalid {
      border-color: #e74c3c;
    }
    
    .error-message {
      color: #e74c3c;
      font-size: 14px;
      margin-top: 5px;
    }
    
    .form-actions {
      margin-top: 30px;
    }
    
    .submit-button {
      background-color: #3498db;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 4px;
      font-size: 16px;
      cursor: pointer;
      transition: background-color 0.3s ease;
    }
    
    .submit-button:hover {
      background-color: #2980b9;
    }
    
    .form-success {
      margin-top: 20px;
      padding: 15px;
      background-color: #d4edda;
      color: #155724;
      border-radius: 4px;
      text-align: center;
    }
    
    .google-map {
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
      margin-bottom: 20px;
    }
    
    .contact-info {
      margin-top: 30px;
    }
    
    .info-item {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
      color: #2c3e50;
    }
    
    .info-item i {
      margin-right: 10px;
      color: #3498db;
      font-size: 18px;
      width: 25px;
      text-align: center;
    }
    
    /* Styles for the parsed form from WordPress */
    :host ::ng-deep .wpforms-container {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    
    :host ::ng-deep .wpforms-field {
      margin-bottom: 20px;
    }
    
    :host ::ng-deep .wpforms-field-label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: #2c3e50;
    }
    
    :host ::ng-deep .wpforms-field-large,
    :host ::ng-deep .wpforms-field-medium {
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-family: inherit;
      font-size: 16px;
    }
    
    :host ::ng-deep .wpforms-submit {
      background-color: #3498db;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 4px;
      font-size: 16px;
      cursor: pointer;
      transition: background-color 0.3s ease;
    }
    
    :host ::ng-deep .wpforms-submit:hover {
      background-color: #2980b9;
    }
    
    /* Contact info content styles */
    :host ::ng-deep .contact-info-content h4,
    :host ::ng-deep .contact-info-content h6,
    :host ::ng-deep .contact-info-content p,
    :host ::ng-deep .contact-info-content h3 {
      margin-bottom: 15px;
    }
    
    @media (max-width: 768px) {
      .contact-wrapper {
        flex-direction: column;
      }
    }
  `],
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
  
  // Parsed form and contact info from API
  parsedForm: SafeHtml | null = null;
  contactFormTitle = 'Send Us a Message';
  contactInfoTitle = 'Get in touch with us';
  contactInfoContent: SafeHtml | null = null;
  
  // Map data
  showMap = false;
  mapEmbedUrl: SafeResourceUrl;

  constructor(
    protected override contentPagesService: ContentPagesService,
    protected override seoService: SeoService,
    private formBuilder: FormBuilder,
    private sanitizer: DomSanitizer,
    protected override router: Router
  ) {
    super(contentPagesService, seoService, router);
    
    // Initialize form for fallback
    this.contactForm = this.formBuilder.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      subject: ['', Validators.required],
      message: ['', Validators.required]
    });
    
    // Default Google Map URL (will be replaced with API data when loaded)
    this.mapEmbedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3606.9258311609884!2d55.5236799154227!3d25.38662088380236!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f5dc4131292a3%3A0xb0d0def7dcead2a!2sShams%20Business%20Centre!5e0!3m2!1sen!2sus!4v1716308012345!5m2!1sen!2sus'
    );
  }

  // Getter for easy access to form fields
  get f() { 
    return this.contactForm.controls; 
  }
  
  protected override fetchPageContent(silent: boolean = false): void {
    super.fetchPageContent(silent);
    
    // Additional processing for contact page
    this.getPageContent().subscribe(data => {
      if (data) {
        this.parseContentFromHTML(data);
      }
    });
  }
  
  // Parse the HTML content to extract form and contact info
  private parseContentFromHTML(data: any): void {
    try {
      if (data.content && data.content.rendered) {
        const htmlContent = data.content.rendered;
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        
        // Extract form title
        const formHeading = doc.querySelector('.elementor-element-ca20b00 .elementor-heading-title');
        if (formHeading && formHeading.textContent) {
          this.contactFormTitle = formHeading.textContent.trim();
        }
        
        // Extract contact info title
        const infoHeading = doc.querySelector('.elementor-element-26af80b .elementor-heading-title');
        if (infoHeading && infoHeading.textContent) {
          this.contactInfoTitle = infoHeading.textContent.trim();
        }
        
        // Extract form
        const formElement = doc.querySelector('.elementor-element-50a6401 .elementor-shortcode');
        if (formElement) {
          // We need to sanitize the HTML before binding it to prevent XSS
          this.parsedForm = this.sanitizer.bypassSecurityTrustHtml(formElement.innerHTML);
        }
        
        // Extract contact info content
        const infoColumn = doc.querySelector('.elementor-element-4e729dc');
        if (infoColumn) {
          // Create a div to hold the contact info
          const contactInfoHtml = document.createElement('div');
          
          // Add the subtitle (if exists)
          const subtitle = infoColumn.querySelector('.elementor-element-c35263e .elementor-heading-title');
          if (subtitle) {
            const h6 = document.createElement('h6');
            h6.textContent = subtitle.textContent || '';
            contactInfoHtml.appendChild(h6);
          }
          
          // Add the Office heading
          const officeHeading = infoColumn.querySelector('.elementor-element-0b0e079 .elementor-heading-title');
          if (officeHeading) {
            contactInfoHtml.appendChild(officeHeading.cloneNode(true));
          }
          
          // Add the address
          const address = infoColumn.querySelector('.elementor-element-c8041f0 .elementor-heading-title');
          if (address) {
            const p = document.createElement('p');
            p.textContent = address.textContent || '';
            contactInfoHtml.appendChild(p);
          }
          
          // Add the phone
          const phone = infoColumn.querySelector('.elementor-element-724fa20 .elementor-heading-title');
          if (phone) {
            contactInfoHtml.appendChild(phone.cloneNode(true));
          }
          
          // Convert to safe HTML
          this.contactInfoContent = this.sanitizer.bypassSecurityTrustHtml(contactInfoHtml.innerHTML);
          
          // Set the map embed URL based on the address
          if (address && address.textContent) {
            // Extract map URL or generate one based on address
            const addressText = address.textContent.trim();
            if (addressText.includes('Sharjah')) {
              // Sharjah Media City
              this.mapEmbedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
                'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3606.9258311609884!2d55.5236799154227!3d25.38662088380236!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f5dc4131292a3%3A0xb0d0def7dcead2a!2sShams%20Business%20Centre!5e0!3m2!1sen!2sus!4v1716308012345!5m2!1sen!2sus'
              );
              this.showMap = true;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error parsing HTML content:', error);
    }
  }
  
  onSubmit() {
    this.submitted = true;
    
    // Stop if form is invalid
    if (this.contactForm.invalid) {
      return;
    }
    
    // Here you would typically submit the form to a backend API
    console.log('Form submitted:', this.contactForm.value);
    
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
