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
    if (!dateString) return 'N/A';

    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getFileIcon(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase() || '';

    const iconMap: {[key: string]: string} = {
      'pdf': 'pi-file-pdf',
      'doc': 'pi-file-word',
      'docx': 'pi-file-word',
      'xls': 'pi-file-excel',
      'xlsx': 'pi-file-excel',
      'ppt': 'pi-file-powerpoint',
      'pptx': 'pi-file-powerpoint',
      'jpg': 'pi-image',
      'jpeg': 'pi-image',
      'png': 'pi-image',
      'gif': 'pi-image',
      'zip': 'pi-file-archive',
      'rar': 'pi-file-archive',
      'mp3': 'pi-volume-up',
      'mp4': 'pi-video',
      'default': 'pi-file'
    };

    return `pi ${iconMap[extension] || iconMap['default']}`;
  }

  getRemainingDownloads(download: any): string {
    if (!download.download_limit) return 'Unlimited';

    const remaining = download.download_limit - download.download_count;
    return remaining.toString();
  }

  isDownloadExpired(download: any): boolean {
    if (!download.access_expires) return false;

    const expiryDate = new Date(download.access_expires);
    const now = new Date();

    return expiryDate < now;
  }
}
