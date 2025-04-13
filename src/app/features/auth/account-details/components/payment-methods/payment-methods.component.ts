import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WooCommerceAccountService } from '../../account-details.service';

@Component({
  selector: 'app-payment-methods',
  templateUrl: './payment-methods.component.html',
  styleUrls: ['./payment-methods.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class PaymentMethodsComponent implements OnInit {
  paymentGateways: any[] = [];
  isLoading = true;
  error: string | null = null;

  private accountService = inject(WooCommerceAccountService);

  ngOnInit(): void {
    this.loadPaymentMethods();
  }

  loadPaymentMethods(): void {
    this.accountService.getPaymentGateways().subscribe({
      next: (data) => {
        // Filter to only show enabled gateways
        this.paymentGateways = data.filter((gateway: any) => gateway.enabled);
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Failed to load payment methods. Please try again later.';
        this.isLoading = false;
        console.error('Error loading payment methods:', err);
      }
    });
  }
}
