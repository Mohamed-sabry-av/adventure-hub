import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-sort-menu',
  imports: [CommonModule, MatSelectModule,FormsModule],
    templateUrl: './sort-menu.component.html',
  styleUrl: './sort-menu.component.css'
})
export class SortMenuComponent {
  @Output() sortChange = new EventEmitter<string>();
  selectedSort: string = 'newest';
  sortOptions = [
    { name: 'Newest', value: 'newest' },
    { name: 'Most Popular', value: 'popular' },
    { name: 'Best Rating', value: 'rating' },
    { name: 'Price: Low to High', value: 'price-asc' },
    { name: 'Price: High to Low', value: 'price-desc' },
  ];

  onSortChange(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    this.sortChange.emit(selectElement.value);
  }
}
