import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CarouselModule } from 'primeng/carousel';

@Component({
  selector: 'app-main-slider',
  imports: [CarouselModule],
  templateUrl: './main-slider.component.html',
  styleUrl: './main-slider.component.css',
})
export class MainSliderComponent {
  images = ['slider/slider15.webp', 'slider/1.png', 'slider/2.png'];
}
