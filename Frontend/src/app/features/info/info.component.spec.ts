import { TestBed } from '@angular/core/testing';
import { InfoComponent } from './info.component';

describe('InfoComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InfoComponent]
    }).compileComponents();
  });

  it('should render the heading "How it works" as h1', () => {
    const fixture = TestBed.createComponent(InfoComponent);
    fixture.detectChanges();
    const h1 = (fixture.nativeElement as HTMLElement).querySelector('h1');
    expect(h1?.textContent?.trim()).toBe('How it works');
  });

  it('should render exactly three steps as an ordered list in order', () => {
    const fixture = TestBed.createComponent(InfoComponent);
    fixture.detectChanges();
    const items = (fixture.nativeElement as HTMLElement).querySelectorAll('ol > li');
    expect(Array.from(items).map(li => li.textContent?.trim())).toEqual([
      'Log in with your work account.',
      'Select a date and a desk.',
      'Receive confirmation and manage your bookings.'
    ]);
  });
});
