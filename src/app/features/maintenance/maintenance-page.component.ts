import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate, state } from '@angular/animations';

@Component({
  selector: 'app-maintenance-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="maintenance-container">
      <div class="maintenance-content" [@fadeInUp]>
        <div class="logo-container">
          <img src="assets/Hub-logo/black-hub.svg" alt="Hub Logo" class="logo">
        </div>
        
        <h1 class="title">We're Under Maintenance</h1>
        
        <div class="divider"></div>
        
        <p class="message">
          We're currently working on making our website even better for you.
          We'll be back online shortly!
        </p>
        
        <div class="maintenance-illustration">
          <div class="gear gear-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </div>
          <div class="gear gear-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </div>
        </div>
        
        <div class="contact-info" [@fadeIn]>
          <p>Need assistance? Contact us on WhatsApp</p>
          <a href="https://wa.me/971508388874" target="_blank" class="whatsapp-button">
            <div class="whatsapp-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
                <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" fill="currentColor"/>
              </svg>
            </div>
            <span>Chat with us on WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .maintenance-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      padding: 2rem;
      position: relative;
      overflow: hidden;
    }
    
    .maintenance-content {
      max-width: 800px;
      width: 100%;
      text-align: center;
      background-color: white;
      border-radius: 20px;
      padding: 3rem 2rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      position: relative;
      z-index: 10;
    }
    
    .logo-container {
      margin-bottom: 2rem;
    }
    
    .logo {
      max-width: 180px;
      height: auto;
    }
    
    .title {
      font-size: 2.5rem;
      font-weight: 700;
      color: #333;
      margin-bottom: 1rem;
    }
    
    .divider {
      width: 80px;
      height: 4px;
      background: linear-gradient(90deg, #25D366, #128C7E);
      margin: 1.5rem auto;
      border-radius: 2px;
    }
    
    .message {
      font-size: 1.2rem;
      line-height: 1.6;
      color: #555;
      margin-bottom: 2rem;
    }
    
    .maintenance-illustration {
      position: relative;
      height: 150px;
      margin: 2rem 0;
    }
    
    .gear {
      position: absolute;
      width: 80px;
      height: 80px;
      color: #333;
    }
    
    .gear-1 {
      left: 50%;
      top: 0;
      margin-left: -80px;
      animation: spin 10s linear infinite;
    }
    
    .gear-2 {
      left: 50%;
      top: 20px;
      margin-left: 10px;
      animation: spin-reverse 7s linear infinite;
    }
    
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
    
    @keyframes spin-reverse {
      100% { transform: rotate(-360deg); }
    }
    
    .contact-info {
      margin-top: 2rem;
      font-size: 1.1rem;
      color: #666;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .whatsapp-button {
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #25D366;
      color: white;
      padding: 12px 24px;
      border-radius: 50px;
      text-decoration: none;
      font-weight: 600;
      margin-top: 1rem;
      box-shadow: 0 4px 12px rgba(37, 211, 102, 0.3);
      transition: all 0.3s ease;
    }
    
    .whatsapp-button:hover {
      transform: translateY(-3px);
      box-shadow: 0 6px 16px rgba(37, 211, 102, 0.4);
    }
    
    .whatsapp-icon {
      width: 24px;
      height: 24px;
      margin-right: 10px;
      color: white;
    }
    
    .whatsapp-icon svg {
      width: 100%;
      height: 100%;
    }
    
    @media (max-width: 768px) {
      .maintenance-content {
        padding: 2rem 1rem;
      }
      
      .title {
        font-size: 2rem;
      }
      
      .message {
        font-size: 1rem;
      }
      
      .logo {
        max-width: 150px;
      }
    }
  `],
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('800ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('1000ms 300ms ease-out', style({ opacity: 1 })),
      ]),
    ]),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MaintenancePageComponent {} 