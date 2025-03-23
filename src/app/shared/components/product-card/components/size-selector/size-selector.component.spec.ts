import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SizeSelectorComponent } from './size-selector.component';

describe('SizeSelectorComponent', () => {
  let component: SizeSelectorComponent;
  let fixture: ComponentFixture<SizeSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SizeSelectorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SizeSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
