import {
  ChangeDetectionStrategy,
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
} from '@angular/core';
import {
  trigger,
  state,
  style,
  transition,
  animate,
} from '@angular/animations';
import { CommonModule } from '@angular/common';
import { UIService } from '../../../../shared/services/ui.service';

@Component({
  selector: 'app-share-popup',
  templateUrl: './share-popup.component.html',
  styleUrls: ['./share-popup.component.css'],
  standalone: true,
  imports: [CommonModule],
  animations: [
    trigger('dialogAnimation', [
      state(
        'open',
        style({
          opacity: 1,
          transform: 'scale(1)',
        })
      ),
      state(
        'closed',
        style({
          opacity: 0,
          transform: 'scale(0.95)',
        })
      ),
      transition('closed => open', [animate('300ms ease-in-out')]),
      transition('open => closed', [animate('200ms ease-in-out')]),
    ]),
  ],
})
export class SharePopupComponent {
  @Input() isVisible: boolean = false;
  @Input() productUrl: string = '';
  @Input() productName: string = '';
  @Output() close = new EventEmitter<void>();
  
  isCopied: boolean = false;
  private uiService = inject(UIService);

  // List of sharing platforms
  sharingPlatforms = [
    {
      name: 'Facebook',
      icon: 'pi pi-facebook',
      color: '#3b5998',
      url: (url: string, text: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
    },
    {
      name: 'Twitter',
      icon: 'pi pi-twitter',
      color: '#1DA1F2',
      url: (url: string, text: string) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
    },
    {
      name: 'WhatsApp',
      icon: 'pi pi-whatsapp',
      color: '#25D366',
      url: (url: string, text: string) => `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`
    },
    {
      name: 'Telegram',
      icon: 'pi pi-telegram',
      color: '#0088cc',
      url: (url: string, text: string) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
    },
    {
      name: 'LinkedIn',
      icon: 'pi pi-linkedin',
      color: '#0077b5',
      url: (url: string, text: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
    },
    {
      name: 'Email',
      icon: 'pi pi-envelope',
      color: '#333333',
      url: (url: string, text: string) => `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(`Check out this product: ${url}`)}`
    }
  ];

  closePopup() {
    this.close.emit();
  }

  // Handle clicks outside the popup
  closeOnOutsideClick(event: MouseEvent) {
    // Check if the click was on the overlay (background) and not on the popup content
    const target = event.target as HTMLElement;
    if (target.classList.contains('fixed')) {
      this.closePopup();
    }
  }

  shareVia(platform: any) {
    window.open(platform.url(this.productUrl, this.productName), '_blank');
    this.closePopup();
  }

  copyLink() {
    navigator.clipboard.writeText(this.productUrl)
      .then(() => {
        this.isCopied = true;
        this.uiService.showSuccess('Link copied to clipboard!');
        setTimeout(() => {
          this.isCopied = false;
        }, 2000);
      })
      .catch((err) => {
        
        this.legacyCopyToClipboard();
      });
  }

  private legacyCopyToClipboard() {
    try {
      // Create temporary input element
      const tempInput = document.createElement('input');
      tempInput.style.position = 'absolute';
      tempInput.style.left = '-1000px';
      tempInput.value = this.productUrl;
      document.body.appendChild(tempInput);
      tempInput.select();
      
      // Try to execute copy command
      const successful = document.execCommand('copy');
      if (successful) {
        this.isCopied = true;
        this.uiService.showSuccess('Link copied to clipboard!');
        setTimeout(() => {
          this.isCopied = false;
        }, 2000);
      } else {
        this.uiService.showError('Please copy this URL manually: ' + this.productUrl);
      }
      
      // Remove the temporary element
      document.body.removeChild(tempInput);
    } catch (error) {
      
      this.uiService.showError('Please copy this URL manually: ' + this.productUrl);
    }
  }
} 