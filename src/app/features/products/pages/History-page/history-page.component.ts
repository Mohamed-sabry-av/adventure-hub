import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RecentlyVisitedComponent } from '../../components/recently-visited/recently-visited.component';

@Component({
  selector: 'app-history-page',
  standalone: true,
  imports: [CommonModule, RecentlyVisitedComponent],
  templateUrl: './history-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,

  styleUrls: ['./history-page.component.css'],
})
export class HistoryPageComponent {
  // This is just a container component for the RecentlyVisitedComponent
}
