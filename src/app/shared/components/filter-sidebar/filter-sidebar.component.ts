import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input,Output } from '@angular/core';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-filter-sidebar',
  imports: [CommonModule, FormsModule],
  templateUrl: './filter-sidebar.component.html',
  styleUrl: './filter-sidebar.component.css'
})
export class FilterSidebarComponent {
  sizes = ['S', 'M', 'L', 'XL'];
  categories = [
    {id: 1, name: 'Men', count: 45},
    {id: 2, name: 'Women', count: 32}
  ];

  applyFilters() {
  
  }
}
