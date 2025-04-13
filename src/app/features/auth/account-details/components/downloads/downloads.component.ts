import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WooCommerceAccountService } from '../../account-details.service';
import { LocalStorageService } from '../../../../../core/services/local-storage.service';

@Component({
  selector: 'app-downloads',
  templateUrl: './downloads.component.html',
  styleUrls: ['./downloads.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class DownloadsComponent implements OnInit {
  downloads: any[] = [];
  isLoading = true;
  error: string | null = null;

  private accountService = inject(WooCommerceAccountService);
  private localStorageService = inject(LocalStorageService);

  ngOnInit(): void {
    this.loadDownloads();
  }

  loadDownloads(): void {
    const customerId = this.getCustomerId();
    if (!customerId) {
      this.error = 'Customer ID not found. Please login again.';
      this.isLoading = false;
      return;
    }

    this.accountService.getDownloads(customerId).subscribe({
      next: (data) => {
        this.downloads = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Failed to load downloads. Please try again later.';
        this.isLoading = false;
        console.error('Error loading downloads:', err);
      }
    });
  }

  getCustomerId(): number | null {
    const customerIdStr:any = this.localStorageService.getItem('customerId');
    return customerIdStr ? parseInt(customerIdStr, 10) : null;
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
