import { Component, signal, PLATFORM_ID, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppContainerComponent } from '../app-container/app-container.component';
import { trigger, transition, style, animate } from '@angular/animations';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, AppContainerComponent],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css',
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateY(-20px)', opacity: '0' }),
        animate(
          '200ms ease-in',
          style({ transform: 'translateY(0)', opacity: '1' })
        ),
      ]),
      transition(':leave', [
        animate(
          '200ms ease-out',
          style({ transform: 'translateY(-20px)', opacity: '0' })
        ),
      ]),
    ]),
  ],
})
export class FooterComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);
  currentYear: number = new Date().getFullYear();

  supportVisible = signal(false);

  isSmallScreen = signal(isPlatformBrowser(this.platformId) ? window.innerWidth < 768 : false);

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      window.addEventListener('resize', () => {
        this.isSmallScreen.set(window.innerWidth < 768);
      });
    }
  }

  showSupportSection() {
    return !this.isSmallScreen() || this.supportVisible();
  }

  onShowSupportData() {
    this.supportVisible.set(!this.supportVisible());
  }
}
