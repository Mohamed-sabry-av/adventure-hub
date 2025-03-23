import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductImageSliderComponent } from './product-image-slider.component';

describe('ProductImageSliderComponent', () => {
  let component: ProductImageSliderComponent;
  let fixture: ComponentFixture<ProductImageSliderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductImageSliderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductImageSliderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
