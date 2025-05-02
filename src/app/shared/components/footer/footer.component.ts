import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppContainerComponent } from '../app-container/app-container.component';
import { trigger, transition, style, animate } from '@angular/animations';

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
export class FooterComponent {
  currentYear: number = new Date().getFullYear();

  supportVisible = signal(false);

  isSmallScreen = signal(window.innerWidth < 768);

  ngOnInit() {
    window.addEventListener('resize', () => {
      this.isSmallScreen.set(window.innerWidth < 768);
    });
  }

  showSupportSection() {
    return !this.isSmallScreen() || this.supportVisible();
  }

  onShowSupportData() {
    this.supportVisible.set(!this.supportVisible());
  }
}
