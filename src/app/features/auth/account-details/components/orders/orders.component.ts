import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WooCommerceAccountService } from '../../account-details.service';
import { LocalStorageService } from '../../../../../core/services/local-storage.service';

@Component({
  selector: 'app-orders',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class OrdersComponent implements OnInit {
  orders: any[] = [];
  isLoading = true;
  error: string | null = null;

  private accountService = inject(WooCommerceAccountService);
  private localStorageService = inject(LocalStorageService);

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    const customerId = this.getCustomerId();
    if (!customerId) {
      this.error = 'Customer ID not found. Please login again.';
      this.isLoading = false;
      return;
    }

    this.accountService.getOrders(customerId).subscribe({
      next: (data) => {
        this.orders = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Failed to load orders. Please try again later.';
        this.isLoading = false;
        console.error('Error loading orders:', err);
      }
    });
  }

  getCustomerId(): number | null {
    const customerIdStr:any = this.localStorageService.getItem('customerId');
    return customerIdStr ? parseInt(customerIdStr, 10) : null;
  }

  getOrderStatusLabel(status: string): string {
    const statusMap: {[key: string]: string} = {
      'pending': 'Pending',
      'processing': 'Processing',
      'on-hold': 'On Hold',
      'completed': 'Completed',
      'cancelled': 'Cancelled',
      'refunded': 'Refunded',
      'failed': 'Failed'
    };

    return statusMap[status] || status;
  }

  getOrderStatusClass(status: string): string {
    const statusClassMap: {[key: string]: string} = {
      'pending': 'status-pending',
      'processing': 'status-processing',
      'on-hold': 'status-on-hold',
      'completed': 'status-completed',
      'cancelled': 'status-cancelled',
      'refunded': 'status-refunded',
      'failed': 'status-failed'
    };

    return statusClassMap[status] || 'status-default';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
