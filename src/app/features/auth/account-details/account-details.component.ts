import { Component, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { AppContainerComponent } from '../../../shared/components/app-container/app-container.component';
import { ServiceHighlightsComponent } from '../../../shared/components/service-highlights/service-highlights.component';

@Component({
  selector: 'app-account-details',
  imports: [AppContainerComponent, ServiceHighlightsComponent],
  templateUrl: './account-details.component.html',
  styleUrl: './account-details.component.css',
})
export class AccountDetailsComponent {
  private authService = inject(AuthService);
}
