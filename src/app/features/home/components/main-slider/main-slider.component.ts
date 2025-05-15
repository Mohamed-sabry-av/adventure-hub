import { ChangeDetectionStrategy, Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-main-slider',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './main-slider.component.html',
  styleUrls: ['./main-slider.component.css'],
})
export class MainSliderComponent implements OnInit {
  images = ['slider/slider15.webp', 'slider/1.png', 'slider/2.png'];
  screenWidth = window.innerWidth;
  showControls = true;

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.screenWidth = window.innerWidth;
    this.showControls = this.screenWidth > 768;
  }

  ngOnInit(): void {
    this.screenWidth = window.innerWidth;
    this.showControls = this.screenWidth > 768;
  }
}
