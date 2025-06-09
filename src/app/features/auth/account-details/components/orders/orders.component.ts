import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  ChangeDetectorRef,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { WooCommerceAccountService } from '../../account-details.service';
import { LocalStorageService } from '../../../../../core/services/local-storage.service';
import { Subject, catchError, finalize, forkJoin, of, takeUntil } from 'rxjs';
import { RouterLink } from '@angular/router';
@Component({
  selector: 'app-orders',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.css'],
  standalone: true,
  imports: [CommonModule, RouterLink],
})
export class OrdersComponent implements OnInit, OnDestroy {
  orders: any[] = [];
  isLoading = true;
  error: string | null = null;
  hasOrders = false;
  private destroy$ = new Subject<void>();
  private accountService = inject(WooCommerceAccountService);
  private localStorageService = inject(LocalStorageService);
  private cdr = inject(ChangeDetectorRef);
  ngOnInit(): void {
    this.loadOrders();
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  loadOrders(): void {
    this.isLoading = true;
    this.error = null;
    const customerId = this.getCustomerId();
    if (!customerId) {
      this.error = 'Customer ID not found. Please login again.';
      this.isLoading = false;
      return;
    }
    // استخدم WooCommerce REST API للحصول على الطلبات
    this.accountService.getOrders(customerId)
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          console.error('Error loading orders from primary source:', err);
          // محاولة استراتيجية بديلة للحصول على الطلبات
          return this.accountService.getCustomerOrders();
        }),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (data) => {
          if (Array.isArray(data)) {
            this.orders = this.processOrders(data);
            this.hasOrders = this.orders.length > 0;

          } else if (data && typeof data === 'object') {
            // تحقق مما إذا كان هناك بيانات في تنسيق مختلف
            if (Array.isArray(data.orders)) {
              this.orders = this.processOrders(data.orders);
            } else if (data.success === false) {
              this.error = data.message || 'Failed to load orders.';
            }
            this.hasOrders = this.orders.length > 0;
          } else {
            this.error = 'Invalid order data format received.';
          }
        },
        error: (err) => {
          this.error = 'Failed to load orders. Please try again later.';
          console.error('Error loading orders:', err);
        },
      });
  }
  private processOrders(orders: any[]): any[] {
    // معالجة بيانات الطلبات وتنسيقها
    return orders.map(order => {
      // التأكد من وجود المعلومات الأساسية
      return {
        ...order,
        formattedDate: this.formatDate(order.date_created || order.date || ''),
        statusLabel: this.getOrderStatusLabel(order.status || 'processing'),
        statusClass: this.getOrderStatusClass(order.status || 'processing'),
        total: this.formatPrice(order.total || '0')
      };
    }).sort((a, b) => {
      // ترتيب الطلبات حسب التاريخ (الأحدث أولاً)
      const dateA = new Date(a.date_created || a.date || 0).getTime();
      const dateB = new Date(b.date_created || b.date || 0).getTime();
      return dateB - dateA;
    });
  }
  getCustomerId(): number | null {
    const customerIdStr: any = this.localStorageService.getItem('customerId');
    return customerIdStr ? parseInt(customerIdStr, 10) : null;
  }
  getOrderStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      pending: 'Pending',
      processing: 'Processing',
      'on-hold': 'On Hold',
      completed: 'Completed',
      cancelled: 'Cancelled',
      refunded: 'Refunded',
      failed: 'Failed',
    };
    return statusMap[status] || status;
  }
  getOrderStatusClass(status: string): string {
    const statusClassMap: { [key: string]: string } = {
      pending: 'status-pending',
      processing: 'status-processing',
      'on-hold': 'status-on-hold',
      completed: 'status-completed',
      cancelled: 'status-cancelled',
      refunded: 'status-refunded',
      failed: 'status-failed',
    };
    return statusClassMap[status] || 'status-default';
  }
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  formatPrice(price: string | number): string {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numPrice)) return '$0.00';
    return `$${numPrice.toFixed(2)}`;
  }
}

