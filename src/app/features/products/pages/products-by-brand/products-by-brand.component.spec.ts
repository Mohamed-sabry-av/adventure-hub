import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductsByBrandComponent } from './products-by-brand.component';

describe('ProductsByBrandComponent', () => {
  let component: ProductsByBrandComponent;
  let fixture: ComponentFixture<ProductsByBrandComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductsByBrandComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductsByBrandComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
