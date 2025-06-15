import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaintenanceService } from '../../core/services/maintenance.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-maintenance-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [MaintenanceService],
  template: `
    <div class="config-container">
      <h2>Maintenance Mode Configuration</h2>
      
      <div class="toggle-container">
        <label class="switch">
          <input type="checkbox" [checked]="maintenanceService.isMaintenance" 
                 (change)="toggleMaintenance($event)">
          <span class="slider round"></span>
        </label>
        <span class="toggle-label">
          {{ maintenanceService.isMaintenance ? 'Maintenance Mode ON' : 'Maintenance Mode OFF' }}
        </span>
      </div>
      
      <div class="info-box">
        <h3>How to bypass maintenance mode:</h3>
        <p>Add <code>?bypass_maintenance=true</code> to any URL to bypass the maintenance page.</p>
        <p>Example: <code>https://yoursite.com/?bypass_maintenance=true</code></p>
      </div>
    </div>
  `,
  styles: [`
    .config-container {
      max-width: 600px;
      margin: 2rem auto;
      padding: 2rem;
      background-color: white;
      border-radius: 10px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }
    
    h2 {
      color: #333;
      margin-bottom: 1.5rem;
      text-align: center;
    }
    
    .toggle-container {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 2rem;
    }
    
    .toggle-label {
      margin-left: 1rem;
      font-size: 1.1rem;
      font-weight: 500;
    }
    
    .switch {
      position: relative;
      display: inline-block;
      width: 60px;
      height: 34px;
    }
    
    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    
    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #ccc;
      transition: .4s;
    }
    
    .slider:before {
      position: absolute;
      content: "";
      height: 26px;
      width: 26px;
      left: 4px;
      bottom: 4px;
      background-color: white;
      transition: .4s;
    }
    
    input:checked + .slider {
      background-color: #25D366;
    }
    
    input:focus + .slider {
      box-shadow: 0 0 1px #25D366;
    }
    
    input:checked + .slider:before {
      transform: translateX(26px);
    }
    
    .slider.round {
      border-radius: 34px;
    }
    
    .slider.round:before {
      border-radius: 50%;
    }
    
    .info-box {
      background-color: #f8f9fa;
      border-radius: 8px;
      padding: 1.5rem;
      margin-top: 1.5rem;
    }
    
    .info-box h3 {
      font-size: 1.2rem;
      margin-bottom: 1rem;
      color: #333;
    }
    
    .info-box p {
      margin-bottom: 0.5rem;
      line-height: 1.5;
    }
    
    code {
      background-color: #e9ecef;
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.9rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MaintenanceConfigComponent {
  constructor(public maintenanceService: MaintenanceService) {}
  
  toggleMaintenance(event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.maintenanceService.setMaintenanceMode(isChecked);
  }
} 