import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WooCommerceAccountService } from '../../account-details.service';
import { LocalStorageService } from '../../../../../core/services/local-storage.service';

@Component({
  selector: 'app-addresses',
  templateUrl: './addresses.component.html',
  styleUrls: ['./addresses.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class AddressesComponent implements OnInit {
  customerDetails: any = null;
  isLoading = true;
  error: string | null = null;

  private accountService = inject(WooCommerceAccountService);
  private localStorageService = inject(LocalStorageService);

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
}
