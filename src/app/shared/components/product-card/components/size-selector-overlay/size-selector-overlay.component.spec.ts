import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SizeSelectorOverlayComponent } from './size-selector-overlay.component';

describe('SizeSelectorOverlayComponent', () => {
  let component: SizeSelectorOverlayComponent;
  let fixture: ComponentFixture<SizeSelectorOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SizeSelectorOverlayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SizeSelectorOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
