import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrderMetaDataComponent } from './order-meta-data.component';
describe('OrderMetaDataComponent', () => {
  let component: OrderMetaDataComponent;
  let fixture: ComponentFixture<OrderMetaDataComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderMetaDataComponent]
    })
    .compileComponents();
    fixture = TestBed.createComponent(OrderMetaDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

