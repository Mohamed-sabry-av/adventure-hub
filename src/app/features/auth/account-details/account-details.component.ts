import {
  Component,
  OnInit,
  inject,
  HostListener,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { AppContainerComponent } from '../../../shared/components/app-container/app-container.component';
import { ServiceHighlightsComponent } from '../../../shared/components/service-highlights/service-highlights.component';
import { WooCommerceAccountService } from './account-details.service';

// Import all the components
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { OrdersComponent } from './components/orders/orders.component';
import { DownloadsComponent } from './components/downloads/downloads.component';
import { AddressesComponent } from './components/addresses/addresses.component';
import { PaymentMethodsComponent } from './components/payment-methods/payment-methods.component';
import { WishlistComponent } from './components/wishlist/wishlist.component';
import { AccountDetailsEditComponent } from './components/account-details-edit/account-details-edit.component';

@Component({
  selector: 'app-account-details',
  templateUrl: './account-details.component.html',
  styleUrls: ['./account-details.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    AppContainerComponent,
    ServiceHighlightsComponent,
    DashboardComponent,
    OrdersComponent,
    DownloadsComponent,
    AddressesComponent,
    PaymentMethodsComponent,
    WishlistComponent,
    AccountDetailsEditComponent,
  ],
})
export class AccountDetailsComponent implements OnInit {
  activeSection: string = 'dashboard';
  isMobileMenuOpen: boolean = false;

  private accountService = inject(WooCommerceAccountService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  @HostListener('sectionChange', ['$event'])
  onSectionChange(event: CustomEvent) {
    if (event.detail) {
      this.setActiveSection(event.detail);
    }
  }

  ngOnInit(): void {
    // Get the active section from the route if available
    this.route.queryParams.subscribe((params) => {
      if (params['section']) {
        this.activeSection = params['section'];
      }
    });
  }

  setActiveSection(section: string): void {
    this.activeSection = section;
    this.isMobileMenuOpen = false;

    // Update the URL query parameter
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { section },
      queryParamsHandling: 'merge',
    });
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  logout(): void {
    this.accountService.logout();
    this.router.navigate(['/user/myaccount']);
  }
}
