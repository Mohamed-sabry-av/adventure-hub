import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { WooCommerceAccountService } from '../../account-details.service';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
@Component({
  selector: 'app-payment-methods',
  templateUrl: './payment-methods.component.html',
  styleUrls: ['./payment-methods.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
})
export class PaymentMethodsComponent implements OnInit {
  paymentGateways: any[] = [];
  isLoading = true;
  error: string | null = null;
  selectedPaymentMethod: any = null;
  paymentForm: FormGroup;
  isSaving = false;
  saveSuccess = false;
  private accountService = inject(WooCommerceAccountService);
  private fb = inject(FormBuilder);
  constructor() {
    this.paymentForm = this.fb.group({
      card_number: [
        '',
        [Validators.required, Validators.pattern('^[0-9]{16}$')],
      ],
      expiry_month: [
        '',
        [Validators.required, Validators.pattern('^(0[1-9]|1[0-2])$')],
      ],
      expiry_year: [
        '',
        [Validators.required, Validators.pattern('^[0-9]{4}$')],
      ],
      cvv: ['', [Validators.required, Validators.pattern('^[0-9]{3,4}$')]],
      card_holder: ['', Validators.required],
    });
  }
  ngOnInit(): void {
    this.loadPaymentGateways();
  }
  loadPaymentGateways(): void {
    this.isLoading = true;
    this.error = null;
    this.accountService.getPaymentGateways().subscribe({
      next: (data) => {
        // Filter to only show enabled payment gateways
        this.paymentGateways = data.filter((gateway: any) => gateway.enabled);
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Failed to load payment methods. Please try again later.';
        this.isLoading = false;
        
      },
    });
  }
  selectPaymentMethod(gateway: any): void {
    this.selectedPaymentMethod = gateway;
    this.saveSuccess = false;
    // Reset form when selecting a new payment method
    this.paymentForm.reset();
  }
  cancelEdit(): void {
    this.selectedPaymentMethod = null;
  }
  savePaymentMethod(): void {
    if (this.paymentForm.invalid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.paymentForm.controls).forEach((key) => {
        const control = this.paymentForm.get(key);
        control?.markAsTouched();
      });
      return;
    }
    this.isSaving = true;
    const formData = this.paymentForm.value;
    // In a real implementation, you would send this data to your backend
    // For security reasons, sensitive card data should never be stored on WooCommerce directly
    // Instead, you would use a payment processor's tokenization service
    setTimeout(() => {
      // Simulate successful save
      this.isSaving = false;
      this.saveSuccess = true;
      // Reset form after successful save
      this.paymentForm.reset();
    }, 1500);
  }
  getPaymentMethodIcon(gatewayId: string): string {
    const iconMap: { [key: string]: string } = {
      stripe: 'pi-credit-card',
      paypal: 'pi-paypal',
      cod: 'pi-money-bill',
      bacs: 'pi-bank',
      cheque: 'pi-money-check',
      default: 'pi-credit-card',
    };
    return iconMap[gatewayId] || iconMap['default'];
  }
}

