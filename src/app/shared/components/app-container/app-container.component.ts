import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-app-container',
  imports: [],
  templateUrl: './app-container.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,

  styleUrl: './app-container.component.css',
})
export class AppContainerComponent {}
