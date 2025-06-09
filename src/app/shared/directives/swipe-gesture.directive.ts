import { Directive, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';
interface TouchCoordinates {
  x: number;
  y: number;
}
@Directive({
  selector: '[appSwipeGesture]',
  standalone: true
})
export class SwipeGestureDirective {
  private startTouch: TouchCoordinates | null = null;
  private readonly minSwipeDistance = 50; // Minimum distance for a swipe to be detected
  @Input() swipeDirection: 'left' | 'right' | 'up' | 'down' = 'left'; // Default to left swipe
  @Output() swipe = new EventEmitter<void>();
  constructor(private el: ElementRef) {}
  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    this.startTouch = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY
    };
  }
  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent): void {
    if (!this.startTouch) return;
    const endTouch = {
      x: event.changedTouches[0].clientX,
      y: event.changedTouches[0].clientY
    };
    // Calculate the distances moved
    const distanceX = endTouch.x - this.startTouch.x;
    const distanceY = endTouch.y - this.startTouch.y;
    // Check if the swipe is horizontal (more X movement than Y)
    const isHorizontal = Math.abs(distanceX) > Math.abs(distanceY);
    // Determine swipe direction and emit if it matches the designated direction
    if (this.swipeDirection === 'left' && isHorizontal && distanceX < -this.minSwipeDistance) {
      this.swipe.emit();
    } else if (this.swipeDirection === 'right' && isHorizontal && distanceX > this.minSwipeDistance) {
      this.swipe.emit();
    } else if (this.swipeDirection === 'up' && !isHorizontal && distanceY < -this.minSwipeDistance) {
      this.swipe.emit();
    } else if (this.swipeDirection === 'down' && !isHorizontal && distanceY > this.minSwipeDistance) {
      this.swipe.emit();
    }
    // Reset start position
    this.startTouch = null;
  }
}

