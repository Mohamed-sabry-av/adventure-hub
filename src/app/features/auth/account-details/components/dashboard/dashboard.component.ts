import { Component, OnInit, inject, Output, EventEmitter } from '@angular/core';
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

  @Output() sectionChange = new EventEmitter<string>();

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

  navigateTo(section: string): void {
    // Find parent component (app-account-details) and change the active section
    const parentElement = document.querySelector('app-account-details');
    if (parentElement) {
      const event = new CustomEvent('sectionChange', { detail: section });
      parentElement.dispatchEvent(event);

      // Update the URL parameter directly
      const url = new URL(window.location.href);
      url.searchParams.set('section', section);
      window.history.pushState({}, '', url);

      // This is a workaround for the Angular router, as we're using a more direct DOM approach
      // A better solution would be to use Angular's router or to expose the setActiveSection method
      // in the parent component, but this simpler solution will work for now
      setTimeout(() => {
        window.dispatchEvent(new Event('popstate'));
      }, 100);
    }
  }
}
