import { Component, OnInit, inject } from '@angular/core';
import { WooCommerceAccountService } from '../../account-details.service';
import { LocalStorageService } from '../../../../../core/services/local-storage.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class DashboardComponent implements OnInit {
  customerDetails: any = null;
  isLoading = true;
  error: string | null = null;

  private accountService = inject(WooCommerceAccountService);
  private localStorageService = inject(LocalStorageService);

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
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Failed to load customer details. Please try again later.';
        this.isLoading = false;
        console.error('Error loading customer details:', err);
      }
    });
  }

  getCustomerId(): number | null {
    const customerIdStr:any = this.localStorageService.getItem('customerId');
    return customerIdStr ? parseInt(customerIdStr, 10) : null;
  }
}
