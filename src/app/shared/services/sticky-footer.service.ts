import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class StickyFooterService {
  private isMobileDevice = window.innerWidth < 768;
  private isFooterVisibleSubject = new BehaviorSubject<boolean>(false);
  isFooterVisible$ = this.isFooterVisibleSubject.asObservable();
  private scrollThreshold = 500;

  constructor() {
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
  }

  private handleResize() {
    this.isMobileDevice = window.innerWidth < 768;
    if (!this.isMobileDevice) {
      this.isFooterVisibleSubject.next(false);
    }
  }

  initScrollHandler(): () => void {
    const handler = () => {
      if (this.isMobileDevice) {
        const scrollPosition =
          window.pageYOffset || document.documentElement.scrollTop;
        this.isFooterVisibleSubject.next(scrollPosition > this.scrollThreshold);
      }
    };

    window.addEventListener('scroll', handler);
    handler(); // Initial check

    return () => {
      window.removeEventListener('scroll', handler);
      window.removeEventListener('resize', this.handleResize);
    };
  }
}
