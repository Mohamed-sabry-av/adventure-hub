import { ChangeDetectionStrategy, Component, HostListener, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-main-slider',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './main-slider.component.html',
  styleUrls: ['./main-slider.component.css'],
})
export class MainSliderComponent implements OnInit {
  images = ['slider/slider15.webp', 'slider/1.png', 'slider/2.png'];
  screenWidth = 1024; // Default value
  showControls = true;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  @HostListener('window:resize', ['$event'])
  onResize() {
    if (isPlatformBrowser(this.platformId)) {
    this.screenWidth = window.innerWidth;
    this.showControls = this.screenWidth > 768;
    }
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
    this.screenWidth = window.innerWidth;
    this.showControls = this.screenWidth > 768;
    }
  }
}
