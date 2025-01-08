import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValidationContentComponent } from './validation-content.component';

describe('ValidationContentComponent', () => {
  let component: ValidationContentComponent;
  let fixture: ComponentFixture<ValidationContentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ValidationContentComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ValidationContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
