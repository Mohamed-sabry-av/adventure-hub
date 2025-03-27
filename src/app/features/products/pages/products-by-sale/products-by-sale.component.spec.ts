import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductsBySaleComponent } from './products-by-sale.component';

describe('ProductsBySaleComponent', () => {
  let component: ProductsBySaleComponent;
  let fixture: ComponentFixture<ProductsBySaleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductsBySaleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductsBySaleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
