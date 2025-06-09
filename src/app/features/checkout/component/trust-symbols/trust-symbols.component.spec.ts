import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrustSymbolsComponent } from './trust-symbols.component';
describe('TrustSymbolsComponent', () => {
  let component: TrustSymbolsComponent;
  let fixture: ComponentFixture<TrustSymbolsComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrustSymbolsComponent]
    })
    .compileComponents();
    fixture = TestBed.createComponent(TrustSymbolsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

