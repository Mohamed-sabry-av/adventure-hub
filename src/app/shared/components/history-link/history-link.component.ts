import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RecentlyVisitedService } from '../../../core/services/recently-visited.service';
import { map } from 'rxjs';

@Component({
  selector: 'app-history-link',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './history-link.component.html',

  styleUrls: ['./history-link.component.css'],
})
export class HistoryLinkComponent implements OnInit {
  productCount: number = 0;

  constructor(private recentlyVisitedService: RecentlyVisitedService) {}

  ngOnInit(): void {
    // Subscribe to the recently visited products to get the count
    this.recentlyVisitedService.recentlyVisitedProducts$
      .pipe(map((products) => products.length))
      .subscribe((count) => {
        this.productCount = count;
      });
  }
}
