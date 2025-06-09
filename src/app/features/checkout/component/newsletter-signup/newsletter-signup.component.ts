import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { KlaviyoService } from '../../services/klaviyo.service';
@Component({
  selector: 'app-newsletter-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="newsletter-signup">
      <h3>Subscribe to our Newsletter</h3>
      <p>Sign up to receive updates and special offers</p>
      <form [formGroup]="subscribeForm" (ngSubmit)="onSubmit()">
        <div class="form-group">
          <input 
            type="email" 
            formControlName="email" 
            placeholder="Enter your email"
            [ngClass]="{'is-invalid': submitted && f['email'].errors}"
          />
          <div *ngIf="submitted && f['email'].errors" class="error-message">
            <div *ngIf="f['email'].errors['required']">Email is required</div>
            <div *ngIf="f['email'].errors['email']">Please enter a valid email</div>
          </div>
        </div>
        <button type="submit" [disabled]="loading">
          {{ loading ? 'Subscribing...' : 'Subscribe' }}
        </button>
        <div *ngIf="success" class="success-message">
          Thank you for subscribing!
        </div>
        <div *ngIf="error" class="error-message">
          {{ error }}
        </div>
      </form>
    </div>
  `,
  styles: [`
    .newsletter-signup {
      padding: 20px;
      background-color: #f9f9f9;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    h3 {
      margin-top: 0;
      color: #333;
    }
    .form-group {
      margin-bottom: 15px;
    }
    input {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    input.is-invalid {
      border-color: #dc3545;
    }
    button {
      background-color: #4CAF50;
      color: white;
      padding: 10px 15px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    }
    button:disabled {
      background-color: #cccccc;
    }
    .error-message {
      color: #dc3545;
      font-size: 14px;
      margin-top: 5px;
    }
    .success-message {
      color: #28a745;
      font-size: 14px;
      margin-top: 10px;
    }
  `]
})
export class NewsletterSignupComponent {
  subscribeForm: FormGroup;
  loading = false;
  submitted = false;
  success = false;
  error = '';
  constructor(
    private formBuilder: FormBuilder,
    private klaviyoService: KlaviyoService
  ) {
    this.subscribeForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }
  // Getter for easy access to form fields
  get f(): { [key: string]: AbstractControl } { 
    return this.subscribeForm.controls; 
  }
  onSubmit(): void {
    this.submitted = true;
    this.error = '';
    this.success = false;
    // stop here if form is invalid
    if (this.subscribeForm.invalid) {
      return;
    }
    this.loading = true;
    this.klaviyoService.subscribeToNewsletter(this.f['email'].value)
      .subscribe({
        next: () => {
          this.success = true;
          this.loading = false;
          this.subscribeForm.reset();
          this.submitted = false;
        },
        error: (error: any) => {
          this.error = error?.message || 'Failed to subscribe. Please try again.';
          this.loading = false;
        }
      });
  }
} 
