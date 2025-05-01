import { isPlatformBrowser } from '@angular/common';
import { Directive, ElementRef, EventEmitter, Inject, NgZone, OnDestroy, OnInit, Output, PLATFORM_ID } from '@angular/core';

@Directive({
  selector: '[appInViewport]',
  standalone: true
})
export class InViewportDirective implements OnInit, OnDestroy {
  @Output() visibleInViewport = new EventEmitter<boolean>();

  private observer: IntersectionObserver | null = null;
  private isVisible = false;

  constructor(
    private element: ElementRef,
    private zone: NgZone,
    @Inject(PLATFORM_ID) private platformId: Object

  ) {}

  ngOnInit() {
    // Create the observer outside the Angular zone to improve performance
    this.zone.runOutsideAngular(() => {
      if (isPlatformBrowser(this.platformId)) {

        this.observer = new IntersectionObserver(
          ([entry]) => {
            // Run back in Angular zone only when state changes
            if (this.isVisible !== entry.isIntersecting) {
              this.isVisible = entry.isIntersecting;
              this.zone.run(() => {
                this.visibleInViewport.emit(entry.isIntersecting);
              });
            }
          },
          {
            root: null,
            rootMargin: '50px', // Load items a bit before they come into view
            threshold: 0.1 // Trigger when at least 10% of the element is visible
          }
        );
        
        this.observer.observe(this.element.nativeElement);
      }
      });
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}
