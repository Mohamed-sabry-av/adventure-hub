import {
  trigger,
  transition,
  style,
  stagger,
  animate,
  state,
  query,
} from '@angular/animations';
import { NgFor } from '@angular/common';
import { Component, ElementRef, inject, Input, Renderer2 } from '@angular/core';
import { CarouselModule } from 'primeng/carousel';
import { ButtonModule } from 'primeng/button';
import { CartService } from '../../../features/cart/service/cart.service';

@Component({
  selector: 'app-slider-ng',
  imports: [NgFor, CarouselModule],
  templateUrl: './slider-ng.component.html',
  styleUrl: './slider-ng.component.css',
  animations: [
    trigger('fadeState', [
      state('visible', style({ opacity: 1, transform: 'translateX(0)' })),
      transition('void => *', [
        style({ opacity: 0, transform: 'translateX(-50px)' }),
        animate('500ms ease-out'),
      ]),
    ]),
  ],
})
export class SliderNgComponent {
  private elementRef = inject(ElementRef);
  private renderer = inject(Renderer2);
  private cartService = inject(CartService);

  @Input({ required: false }) data!: any[];
  x: string[] = ['left', 'left', 'left', 'left', 'left', 'left'];

  openCart() {
    this.cartService.cartMode(true);
  }

  ngAfterViewInit() {
    setTimeout(() => {
      const items =
        this.elementRef.nativeElement.querySelectorAll('.p-carousel-item');
      items.forEach((item: HTMLElement) => {
        this.renderer.setAttribute(item, 'aria-hidden', 'false');
      });
    }, 500);
  }
}
