import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
} from '@angular/core';

@Component({
  selector: 'app-back-to-top',
  changeDetection: ChangeDetectionStrategy.OnPush,

  template: `
    @if(showButton){

    <button (click)="scrollToTop()" class="back-to-top">↑</button>
    }
  `,
  styles: [
    `
      .back-to-top {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 10px 20px;
        background-color: #2e2e2e;
        color: #fff;
        border: none;
        border-radius: 25px;
        cursor: pointer;
        font-size: 20px;
        font-weight: bold;
        z-index: 1000;
        display: block;
      }
      .back-to-top.hidden {
        display: none;
      }
    `,
  ],
})
export class BackToTopComponent {
  showButton = false;

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.showButton = window.scrollY > 100;
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
