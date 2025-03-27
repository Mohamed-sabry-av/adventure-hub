import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceHighlightsComponent } from './service-highlights.component';

describe('ServiceHighlightsComponent', () => {
  let component: ServiceHighlightsComponent;
  let fixture: ComponentFixture<ServiceHighlightsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceHighlightsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ServiceHighlightsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
