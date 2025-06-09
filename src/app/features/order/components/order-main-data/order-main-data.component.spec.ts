import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrderMainDataComponent } from './order-main-data.component';
describe('OrderMainDataComponent', () => {
  let component: OrderMainDataComponent;
  let fixture: ComponentFixture<OrderMainDataComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderMainDataComponent]
    })
    .compileComponents();
    fixture = TestBed.createComponent(OrderMainDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

