import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-container.component.html',
  styleUrl: './app-container.component.css',
})
export class AppContainerComponent {}

