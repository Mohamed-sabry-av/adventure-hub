import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-service-highlights',
  standalone: true,
  imports: [],
  templateUrl: './service-highlights.component.html',
  styles: [`
    .service-highlight-container {
      background-color: #f8f9fa;
      border-top: 1px solid #eaeaea;
      padding: 2.5rem 0;
      margin-top: 2rem;
    }
    
    /* Title styling */
    .highlight-title-container {
      text-align: center;
      margin-bottom: 2.5rem;
    }
    
    .highlight-title {
      font-size: 1.8rem;
      font-weight: 600;
      color: #333;
      margin: 0;
      padding-bottom: 0.5rem;
    }
    
    .highlight-title-underline {
      width: 80px;
      height: 3px;
      background-color: #3bb54a;
      margin: 0 auto;
      border-radius: 2px;
    }
    
    .highlights-wrapper {
      gap: 1.5rem;
    }
    
    .service-highlight-item {
      padding: 1.25rem;
      border-radius: 10px;
      background-color: white;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      flex: 1;
      min-width: 200px;
    }
    
    .service-highlight-item:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
    }
    
    .highlight-content {
      gap: 1rem;
    }
    
    .service-highlight-icon-container {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 50px;
      height: 50px;
      background-color: rgba(59, 181, 74, 0.1);
      border-radius: 50%;
      flex-shrink: 0;
    }
    
    .service-highlight-icon {
      font-size: 1.4rem;
      color: #3bb54a !important;
    }
    
    .highlight-text {
      flex: 1;
    }
    
    .service-highlight-text {
      margin: 0;
      line-height: 1.5;
    }
    
    .service-highlight-text:first-child {
      color: #333;
      font-size: 0.95rem;
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    .service-highlight-text:last-child {
      font-size: 0.8rem;
      color: #6c757d;
    }
    
    @media (max-width: 768px) {
      .service-highlight-container {
        padding: 1.5rem 0;
      }
      
      .highlight-title-container {
        margin-bottom: 1.5rem;
      }
      
      .highlight-title {
        font-size: 1.5rem;
      }
      
      .service-highlight-item {
        margin-bottom: 1rem;
        padding: 1rem;
      }
      
      .service-highlight-icon-container {
        width: 40px;
        height: 40px;
      }
      
      .service-highlight-icon {
        font-size: 1.1rem;
      }
      
      .service-highlight-text:first-child {
        font-size: 0.85rem;
      }
      
      .service-highlight-text:last-child {
        font-size: 0.75rem;
      }
    }
  `]
})
export class ServiceHighlightsComponent {}
