import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AppContainerComponent } from '../../../../shared/components/app-container/app-container.component';

@Component({
  selector: 'app-about',
  imports: [AppContainerComponent],
  templateUrl: './about.component.html',
  styleUrl: './about.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutComponent {}
