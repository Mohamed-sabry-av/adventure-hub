import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnInit,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { SizeSelectorComponent } from '../size-selector/size-selector.component';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProductService } from '../../../../../core/services/product.service';
import { Product, Variation } from '../../../../../interfaces/product';
import { SideOptionsService } from '../../../../../core/services/side-options.service';

@Component({
  selector: 'app-mobile-quick-add',
  standalone: true,
  imports: [CommonModule, SizeSelectorComponent, FormsModule],
  templateUrl: './quick-add-btn.component.html',
  styleUrls: ['./quick-add-btn.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-in', style({ opacity: 1 })),
      ]),
      transition(':leave', [animate('300ms ease-out', style({ opacity: 0 }))]),
    ]),
  ],
})
export class MobileQuickAddComponent implements OnInit {
  @Input() uniqueSizes: { size: string; inStock: boolean }[] = [];
  @Input() selectedSize: string | null = null;
  @Input() colorOptions: { color: string; image: string; inStock: boolean }[] =
    [];
  @Input() selectedColor: string | null = null;
  @Input() mobileQuickAddExpanded: boolean = false;
  @Input() isMobile: boolean = false;
  @Input() isHovered: boolean = false;
  @Input() visibleColors: { color: string; image: string; inStock: boolean }[] =
    [];
  @Input() product: Product | null = null;
  @Input() selectedVariation: any | null = null;
  @Input() variations: Variation[] = [];

  @Output() toggleMobileQuickAdd = new EventEmitter<void>();
  @Output() selectSize = new EventEmitter<string>();
  @Output() selectColor = new EventEmitter<{ color: string; image: string }>();
  @Output() addToCart = new EventEmitter<{ quantity: number }>();

  addSuccess: boolean = false;

  constructor(
    private cdr: ChangeDetectorRef,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private productService: ProductService,
    private sideOptionsService: SideOptionsService
  ) {}

  ngOnInit() {}

  onToggleOptionsPanel() {
    this.sideOptionsService.openSideOptions({
      product: this.product,
      variations: this.variations,
      selectedVariation: this.selectedVariation,
      uniqueSizes: this.uniqueSizes,
      selectedSize: this.selectedSize,
      colorOptions: this.colorOptions,
      selectedColor: this.selectedColor,
      visibleColors: this.visibleColors,
      isMobile: this.isMobile,
    });
  }
}
