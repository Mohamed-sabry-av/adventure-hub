import { Component } from '@angular/core';
import { AppContainerComponent } from '../../../../shared/components/app-container/app-container.component';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-related-categories',
  imports: [AppContainerComponent, RouterLink],
  templateUrl: './related-categories.component.html',
  styleUrl: './related-categories.component.css',
})
export class RelatedCategoriesComponent {}
