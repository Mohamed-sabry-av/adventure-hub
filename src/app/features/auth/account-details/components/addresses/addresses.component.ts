import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { WooCommerceAccountService } from '../../account-details.service';
import { LocalStorageService } from '../../../../../core/services/local-storage.service';

@Component({
  selector: 'app-addresses',
  templateUrl: './addresses.component.html',
  styleUrls: ['./addresses.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class AddressesComponent implements OnInit {
  customerDetails: any = null;
  isLoading = true;
  error: string | null = null;
  editingBilling = false;
  editingShipping = false;
  billingForm: FormGroup;
  shippingForm: FormGroup;
  isSaving = false;
  saveSuccess = false;

  private accountService = inject(WooCommerceAccountService);
  private localStorageService = inject(LocalStorageService);
  private fb = inject(FormBuilder);

  constructor() {
    this.billingForm = this.createAddressForm();
    this.shippingForm = this.createAddressForm();
  }

  createAddressForm(): FormGroup {
    return this.fb.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      company: [''],
      address_1: ['', Validators.required],
      address_2: [''],
      city: ['', Validators.required],
      state: ['', Validators.required],
      postcode: ['', Validators.required],
      country: ['', Validators.required],
      email: ['', [Validators.email]],
      phone: ['']
    });
  }

  ngOnInit(): void {
    this.loadAddresses();
  }

  loadAddresses(): void {
    const customerId = this.getCustomerId();
    if (!customerId) {
      this.error = 'Customer ID not found. Please login again.';
      this.isLoading = false;
      return;
    }

    this.accountService.getCustomerDetails(customerId).subscribe({
      next: (data) => {
        this.customerDetails = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Failed to load addresses. Please try again later.';
        this.isLoading = false;
        console.error('Error loading addresses:', err);
      }
    });
  }

  getCustomerId(): number | null {
    const customerIdStr:any = this.localStorageService.getItem('customerId');
    return customerIdStr ? parseInt(customerIdStr, 10) : null;
  }

  formatAddress(address: any): string {
    if (!address) return 'No address provided';

    const parts = [
      address.address_1,
      address.address_2,
      address.city,
      address.state,
      address.postcode,
      address.country
    ].filter(part => part && part.trim() !== '');

    return parts.join(', ');
  }

  editBillingAddress(): void {
    this.editingBilling = true;
    this.editingShipping = false;
    this.saveSuccess = false;

    // Populate the form with current billing address
    if (this.customerDetails && this.customerDetails.billing) {
      this.billingForm.patchValue(this.customerDetails.billing);
    }
  }

  editShippingAddress(): void {
    this.editingShipping = true;
    this.editingBilling = false;
    this.saveSuccess = false;

    // Populate the form with current shipping address
    if (this.customerDetails && this.customerDetails.shipping) {
      this.shippingForm.patchValue(this.customerDetails.shipping);
    }
  }

  cancelEdit(): void {
    this.editingBilling = false;
    this.editingShipping = false;
    this.error = null;
  }

  saveBillingAddress(): void {
    if (this.billingForm.invalid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.billingForm.controls).forEach(key => {
        const control = this.billingForm.get(key);
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

    this.accountService.updateBillingAddress(customerId, this.billingForm.value).subscribe({
      next: (data) => {
        this.customerDetails = data;
        this.isSaving = false;
        this.editingBilling = false;
        this.saveSuccess = true;
      },
      error: (err) => {
        this.error = 'Failed to update billing address. Please try again.';
        this.isSaving = false;
        console.error('Error updating billing address:', err);
      }
    });
  }

  saveShippingAddress(): void {
    if (this.shippingForm.invalid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.shippingForm.controls).forEach(key => {
        const control = this.shippingForm.get(key);
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

    this.accountService.updateShippingAddress(customerId, this.shippingForm.value).subscribe({
      next: (data) => {
        this.customerDetails = data;
        this.isSaving = false;
        this.editingShipping = false;
        this.saveSuccess = true;
      },
      error: (err) => {
        this.error = 'Failed to update shipping address. Please try again.';
        this.isSaving = false;
        console.error('Error updating shipping address:', err);
      }
    });
  }

  // In case we need to simulate a successful save when the API is not available
  simulateSave(isShipping: boolean): void {
    setTimeout(() => {
      const formData = isShipping ? this.shippingForm.value : this.billingForm.value;

      if (isShipping) {
        this.customerDetails.shipping = { ...this.customerDetails.shipping, ...formData };
        this.editingShipping = false;
      } else {
        this.customerDetails.billing = { ...this.customerDetails.billing, ...formData };
        this.editingBilling = false;
      }

      this.isSaving = false;
      this.saveSuccess = true;
    }, 1000);
  }
}
