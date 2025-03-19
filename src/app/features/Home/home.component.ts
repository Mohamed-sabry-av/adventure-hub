import { Component } from '@angular/core';
import { SliderNgComponent } from '../../shared/components/slider-ng/slider-ng.component';
import { AppContainerComponent } from '../../shared/components/app-container/app-container.component';

@Component({
  selector: 'app-home',
  imports: [SliderNgComponent, AppContainerComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {}
