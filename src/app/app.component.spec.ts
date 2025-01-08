import {TestBed, ComponentFixture} from '@angular/core/testing';
import { AppComponent } from './app.component';
import {CommonTestingModule} from './testing/common-testing.module';

describe('AppComponent', () => {

  CommonTestingModule.setUpTestBed(AppComponent);
  let app: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(() => {
    console.log('before creating app component');
    fixture = TestBed.createComponent(AppComponent);
    app = fixture.debugElement.componentInstance;
  });

  it('should create the app', () => {
    expect(app).toBeTruthy();
  });

  it(`should have as title 'aphp-formbuilder'`, () => {
    expect(app.title).toEqual('aphp-formbuilder');
  });
});
