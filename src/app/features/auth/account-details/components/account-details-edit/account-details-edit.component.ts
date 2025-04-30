import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { WooCommerceAccountService } from '../../account-details.service';
import { LocalStorageService } from '../../../../../core/services/local-storage.service';

@Component({
  selector: 'app-account-details-edit',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './account-details-edit.component.html',
  styleUrl: './account-details-edit.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountDetailsEditComponent {
  customerDetails: any = null;
  isLoading = true;
  error: string | null = null;
  accountForm: FormGroup;
  isSaving = false;
  saveSuccess = false;
  passwordForm: FormGroup;
  showPasswordForm = false;

  private accountService = inject(WooCommerceAccountService);
  private localStorageService = inject(LocalStorageService);
  private fb = inject(FormBuilder);

  constructor() {
    this.accountForm = this.fb.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      username: ['', Validators.required],
      display_name: [''],
    });

    this.passwordForm = this.fb.group(
      {
        current_password: ['', Validators.required],
        new_password: ['', [Validators.required, Validators.minLength(8)]],
        confirm_password: ['', Validators.required],
      },
      { validator: this.passwordMatchValidator }
    );
  }

  ngOnInit(): void {
    this.loadCustomerDetails();
  }

  loadCustomerDetails(): void {
    const customerId = this.getCustomerId();
    if (!customerId) {
      this.error = 'Customer ID not found. Please login again.';
      this.isLoading = false;
      return;
    }

    this.accountService.getCustomerDetails(customerId).subscribe({
      next: (data) => {
        this.customerDetails = data;
        this.populateForm(data);
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Failed to load account details. Please try again later.';
        this.isLoading = false;
        console.error('Error loading customer details:', err);
      },
    });
  }

  populateForm(data: any): void {
    this.accountForm.patchValue({
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      username: data.username,
      display_name: data.first_name + ' ' + data.last_name,
    });
  }

  getCustomerId(): number | null {
    const customerIdStr: any = this.localStorageService.getItem('customerId');
    return customerIdStr ? parseInt(customerIdStr, 10) : null;
  }

  saveAccountDetails(): void {
    if (this.accountForm.invalid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.accountForm.controls).forEach((key) => {
        const control = this.accountForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    const customerId = this.getCustomerId();
    if (!customerId) {
      this.error = 'Customer ID not found. Please login again.';
      return;
    }

    this.isSaving = true;
    this.error = null;
    this.saveSuccess = false;

    const formData = this.accountForm.value;
    this.accountService.updateCustomerDetails(customerId, formData).subscribe({
      next: (data) => {
        this.customerDetails = data;
        this.isSaving = false;
        this.saveSuccess = true;

        // Update the local storage if email has changed
        if (this.accountForm.value.email !== this.customerDetails.email) {
          const user = JSON.parse(
            this.localStorageService.getItem('auth_user') || '{}'
          );
          user.email = this.accountForm.value.email;
          this.localStorageService.setItem('auth_user', JSON.stringify(user));
        }
      },
      error: (err) => {
        this.error = 'Failed to update account details. Please try again.';
        this.isSaving = false;
        console.error('Error updating customer details:', err);
      },
    });
  }

  togglePasswordForm(): void {
    this.showPasswordForm = !this.showPasswordForm;

    if (!this.showPasswordForm) {
      this.passwordForm.reset();
    }
  }

  changePassword(): void {
    if (this.passwordForm.invalid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.passwordForm.controls).forEach((key) => {
        const control = this.passwordForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    const customerId = this.getCustomerId();
    if (!customerId) {
      this.error = 'Customer ID not found. Please login again.';
      return;
    }

    this.isSaving = true;
    this.error = null;

    const passwordData = {
      password: this.passwordForm.value.new_password,
    };

    this.accountService
      .updateCustomerDetails(customerId, passwordData)
      .subscribe({
        next: () => {
          this.isSaving = false;
          this.showPasswordForm = false;
          this.passwordForm.reset();
          this.saveSuccess = true;
        },
        error: (err) => {
          this.error = 'Failed to update password. Please try again.';
          this.isSaving = false;
          console.error('Error updating password:', err);
        },
      });
  }

  passwordMatchValidator(group: FormGroup): { notMatched: boolean } | null {
    const password = group.get('new_password')?.value;
    const confirmPassword = group.get('confirm_password')?.value;

    return password === confirmPassword ? null : { notMatched: true };
  }
}
