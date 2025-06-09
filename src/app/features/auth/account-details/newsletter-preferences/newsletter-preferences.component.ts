import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NewsletterService } from '../../services/newsletter.service';
import { AccountAuthService } from '../../account-auth.service';
@Component({
  selector: 'app-newsletter-preferences',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="newsletter-preferences">
      <h3>Newsletter Preferences</h3>
      <p>Stay up-to-date with our latest adventures and offers</p>
      <form [formGroup]="newsletterForm" (ngSubmit)="onSubmit()">
        <div class="form-group">
          <label for="email">Email</label>
          <input 
            type="email" 
            id="email"
            formControlName="email" 
            placeholder="Enter your email"
            [ngClass]="{'is-invalid': submitted && f['email'].errors}"
            [attr.disabled]="userEmail ? true : null"
          />
          <div *ngIf="submitted && f['email'].errors" class="error-message">
            <div *ngIf="f['email'].errors['required']">Email is required</div>
            <div *ngIf="f['email'].errors['email']">Please enter a valid email</div>
          </div>
        </div>
        <div class="form-group checkbox-group">
          <label class="checkbox-container">
            <input type="checkbox" formControlName="subscribed" />
            <span class="checkmark"></span>
            I want to receive newsletter emails
          </label>
        </div>
        <button type="submit" [disabled]="loading || newsletterForm.pristine">
          {{ loading ? 'Saving...' : 'Save Preferences' }}
        </button>
        <div *ngIf="success" class="success-message">
          Newsletter preferences updated successfully.
        </div>
        <div *ngIf="error" class="error-message alert">
          {{ error }}
        </div>
      </form>
    </div>
  `,
  styles: [`
    .newsletter-preferences {
      padding: 20px;
      background-color: #f9f9f9;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    h3 {
      margin-top: 0;
      color: #333;
    }
    p {
      color: #666;
      margin-bottom: 20px;
    }
    .form-group {
      margin-bottom: 15px;
    }
    label {
      display: block;
      margin-bottom: 5px;
      font-weight: 500;
    }
    input[type="email"] {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    input[type="email"]:disabled {
      background-color: #f1f1f1;
      cursor: not-allowed;
    }
    input.is-invalid {
      border-color: #dc3545;
    }
    .checkbox-group {
      margin-top: 15px;
    }
    .checkbox-container {
      display: flex;
      align-items: center;
      position: relative;
      padding-left: 30px;
      cursor: pointer;
      user-select: none;
    }
    .checkbox-container input {
      position: absolute;
      opacity: 0;
      cursor: pointer;
      height: 0;
      width: 0;
    }
    .checkmark {
      position: absolute;
      left: 0;
      top: 0;
      height: 20px;
      width: 20px;
      background-color: #eee;
      border: 1px solid #ddd;
      border-radius: 3px;
    }
    .checkbox-container:hover input ~ .checkmark {
      background-color: #ccc;
    }
    .checkbox-container input:checked ~ .checkmark {
      background-color: #4CAF50;
      border-color: #4CAF50;
    }
    .checkmark:after {
      content: "";
      position: absolute;
      display: none;
    }
    .checkbox-container input:checked ~ .checkmark:after {
      display: block;
    }
    .checkbox-container .checkmark:after {
      left: 7px;
      top: 3px;
      width: 5px;
      height: 10px;
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }
    button {
      background-color: #4CAF50;
      color: white;
      padding: 10px 15px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      margin-top: 10px;
    }
    button:disabled {
      background-color: #cccccc;
      cursor: not-allowed;
    }
    .error-message {
      color: #dc3545;
      font-size: 14px;
      margin-top: 5px;
    }
    .error-message.alert {
      background-color: #f8d7da;
      border: 1px solid #f5c6cb;
      padding: 10px;
      border-radius: 4px;
      margin-top: 15px;
    }
    .success-message {
      color: #28a745;
      background-color: #d4edda;
      border: 1px solid #c3e6cb;
      padding: 10px;
      border-radius: 4px;
      margin-top: 15px;
    }
  `]
})
export class NewsletterPreferencesComponent implements OnInit {
  newsletterForm: FormGroup;
  loading = false;
  submitted = false;
  success = false;
  error = '';
  userEmail: string | null = null;
  constructor(
    private formBuilder: FormBuilder,
    private newsletterService: NewsletterService,
    private accountAuthService: AccountAuthService
  ) {
    this.newsletterForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      subscribed: [false]
    });
  }
  ngOnInit(): void {
    // Get user email if available
    const user = this.accountAuthService.getUser();
    if (user && user.email) {
      this.userEmail = user.email;
      this.newsletterForm.patchValue({
        email: user.email
      });
    }
  }
  // Getter for easy access to form fields
  get f(): { [key: string]: AbstractControl } { 
    return this.newsletterForm.controls; 
  }
  onSubmit(): void {
    this.submitted = true;
    this.error = '';
    this.success = false;
    // stop here if form is invalid
    if (this.newsletterForm.invalid) {
      return;
    }
    if (!this.f['subscribed'].value) {
      this.success = true;
      return;
    }
    this.loading = true;
    this.newsletterService.subscribeToNewsletter(this.f['email'].value)
      .subscribe({
        next: () => {
          this.success = true;
          this.loading = false;
        },
        error: (error: any) => {
          this.error = error?.message || 'Failed to update newsletter preferences. Please try again.';
          this.loading = false;
        }
      });
  }
} 
