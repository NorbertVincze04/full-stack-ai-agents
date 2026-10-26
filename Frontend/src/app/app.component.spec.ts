import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RouterLink, RouterModule } from '@angular/router';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterModule.forRoot([])
      ],
      declarations: [
        AppComponent
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'Desk Booking'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('Desk Booking');
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('header h1')?.textContent).toContain('Desk Booking');
    expect(compiled.querySelectorAll('h1').length).toBe(1);
  });

  it('should render a header before main containing the app name', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const header = compiled.querySelector('header');
    expect(header).not.toBeNull();
    expect(header?.textContent).toContain('Desk Booking');
    expect(header?.nextElementSibling?.tagName).toBe('MAIN');
  });

  it('should link the app name to home', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const header = fixture.debugElement.query(By.css('header'));
    const link = header.query(By.directive(RouterLink));
    expect(link).not.toBeNull();
    expect(link.nativeElement.tagName).toBe('A');
    expect(link.injector.get(RouterLink).urlTree?.toString()).toBe('/');
  });

  it('should render a Login button of type button in the header', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector('header button');
    expect(button).not.toBeNull();
    expect(button?.getAttribute('type')).toBe('button');
    expect(button?.textContent?.trim()).toBe('Login');
  });

  it('should render the copyright footer', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const footer = (fixture.nativeElement as HTMLElement).querySelector('footer');
    expect(footer).not.toBeNull();
    expect(footer?.textContent?.trim()).toBe(
      `© ${new Date().getFullYear()} Desk Booking. All rights reserved.`
    );
  });
});
