import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-whatsapp-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <a 
      href="https://wa.me/971508388874" 
      target="_blank" 
      class="whatsapp-button"
      [@fadeIn]="'in'"
      aria-label="Contact us on WhatsApp">
      <div class="pulse-animation"></div>
      <div class="icon-container">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="whatsapp-icon">
          <!-- WhatsApp icon -->
          <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" fill="currentColor"/>
        </svg>
      </div>
      <div class="tooltip">
        <span>Chat on WhatsApp</span>
        <span class="tooltip-number">+971 50 838 8874</span>
      </div>
    </a>
  `,
  styles: [`
    .whatsapp-button {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      align-items: center;
      text-decoration: none;
      transition: all 0.3s ease;
    }

    .icon-container {
      width: 60px;
      height: 60px;
      background-color: #25D366;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
      position: relative;
      z-index: 2;
      transition: transform 0.3s ease;
    }

    .whatsapp-button:hover .icon-container {
      transform: scale(1.1);
    }

    .whatsapp-icon {
      width: 30px;
      height: 30px;
      color: white;
    }

    .pulse-animation {
      position: absolute;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: #25D366;
      opacity: 0.5;
      z-index: 1;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% {
        transform: scale(1);
        opacity: 0.5;
      }
      70% {
        transform: scale(1.3);
        opacity: 0;
      }
      100% {
        transform: scale(1.3);
        opacity: 0;
      }
    }

    .tooltip {
      background-color: #ffffff;
      color: #333;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 14px;
      margin-right: 10px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      display: flex;
      flex-direction: column;
      max-width: 0;
      overflow: hidden;
      opacity: 0;
      transition: all 0.3s ease;
      white-space: nowrap;
    }

    .tooltip-number {
      font-weight: bold;
      margin-top: 2px;
      color: #25D366;
    }

    .whatsapp-button:hover .tooltip {
      max-width: 200px;
      opacity: 1;
      margin-right: 20px;
    }

    @media (max-width: 768px) {
      .icon-container {
        width: 50px;
        height: 50px;
      }
      
      .pulse-animation {
        width: 50px;
        height: 50px;
      }
      
      .whatsapp-icon {
        width: 25px;
        height: 25px;
      }
      
      .whatsapp-button {
        bottom: 15px;
        right: 15px;
      }
    }
  `],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('500ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WhatsappButtonComponent {} 