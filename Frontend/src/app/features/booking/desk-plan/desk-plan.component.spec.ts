import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Desk, DeskAvailability } from '../booking.models';
import { DeskPlanComponent } from './desk-plan.component';

describe('DeskPlanComponent', () => {
  let fixture: ComponentFixture<DeskPlanComponent>;
  let root: HTMLElement;

  const ids = Array.from({ length: 16 }, (_, i) => `${'ABCD'[Math.floor(i / 4)]}${(i % 4) + 1}`);
  const layout: Desk[] = ids.map((id, i) => ({ id, label: id, row: Math.floor(i / 4) + 1, col: (i % 4) + 1 }));
  const allFree: DeskAvailability[] = ids.map(id => ({ id, booked: false }));

  function render(inputs: {
    desks?: Desk[];
    availability?: DeskAvailability[] | null;
    selectedDesk?: string | null;
    yourDesk?: string | null;
    signedIn?: boolean;
  }): void {
    const ref = fixture.componentRef;
    ref.setInput('desks', inputs.desks ?? layout);
    ref.setInput('availability', inputs.availability ?? null);
    ref.setInput('selectedDesk', inputs.selectedDesk ?? null);
    ref.setInput('yourDesk', inputs.yourDesk ?? null);
    ref.setInput('signedIn', inputs.signedIn ?? false);
    fixture.detectChanges();
  }

  const buttons = () => Array.from(root.querySelectorAll<HTMLButtonElement>('button.desk'));
  const desk = (id: string) => root.querySelector<HTMLButtonElement>(`button.desk[aria-label^="Desk ${id}"]`)!;

  beforeEach(() => {
    TestBed.configureTestingModule({ declarations: [DeskPlanComponent] });
    fixture = TestBed.createComponent(DeskPlanComponent);
    root = fixture.nativeElement;
  });

  describe('signed out (AC1)', () => {
    beforeEach(() => render({ signedIn: false, availability: null }));

    it('should render exactly 16 desk buttons from the layout', () => {
      expect(buttons().length).toBe(16);
      expect(buttons().map(b => b.querySelector('.desk-label')?.textContent?.trim())).toEqual(ids);
    });

    it('should place desks in a 4 x 4 grid from row and col', () => {
      const cells = buttons().map(b => `${b.style.gridRowStart}/${b.style.gridColumnStart}`);
      expect(new Set(cells).size).toBe(16);
      expect(cells[0]).toBe('1/1');
      expect(cells[3]).toBe('1/4');
      expect(cells[4]).toBe('2/1');
      expect(cells[15]).toBe('4/4');
    });

    it('should show desks without state: disabled, aria-disabled, no state text', () => {
      for (const b of buttons()) {
        expect(b.disabled).toBeTrue();
        expect(b.getAttribute('aria-disabled')).toBe('true');
        expect(b.querySelector('.desk-state')).toBeNull();
        expect(b.getAttribute('aria-label')).toMatch(/^Desk [A-D][1-4]$/);
        expect(b.classList.contains('available') || b.classList.contains('booked')).toBeFalse();
      }
    });

    it('should show a log-in hint', () => {
      expect(root.querySelector('.plan-hint')?.textContent).toMatch(/log in/i);
    });

    it('should not emit when a neutral desk is clicked', () => {
      const emitted: string[] = [];
      fixture.componentInstance.deskSelected.subscribe(id => emitted.push(id));
      desk('A1').click();
      expect(emitted).toEqual([]);
    });
  });

  describe('signed in (AC2, AC3)', () => {
    const availability: DeskAvailability[] = ids.map(id =>
      id === 'A4' ? { id, booked: true, bookedBy: 'Ana' } : { id, booked: false }
    );

    beforeEach(() => render({ signedIn: true, availability }));

    it('should hide the log-in hint', () => {
      expect(root.querySelector('.plan-hint')).toBeNull();
    });

    it('should name a free desk "Desk A3, available" with state text and icon besides colour', () => {
      const b = desk('A3');
      expect(b.getAttribute('aria-label')).toBe('Desk A3, available');
      expect(b.querySelector('.desk-label')?.textContent?.trim()).toBe('A3');
      expect(b.querySelector('.desk-state')?.textContent).toMatch(/Available/);
      expect(b.querySelector('.desk-state [aria-hidden="true"]')?.textContent?.trim()).not.toBe('');
      expect(b.disabled).toBeFalse();
      expect(b.getAttribute('aria-disabled')).toBe('false');
    });

    it('should name a booked desk "Desk A4, booked by Ana", show the name and disable it (AC5)', () => {
      const b = desk('A4');
      expect(b.getAttribute('aria-label')).toBe('Desk A4, booked by Ana');
      expect(b.querySelector('.desk-state')?.textContent).toMatch(/Booked/);
      expect(b.querySelector('.desk-by')?.textContent?.trim()).toBe('Ana');
      expect(b.disabled).toBeTrue();
      expect(b.getAttribute('aria-disabled')).toBe('true');
    });

    it('should not emit when a booked desk is clicked (AC5)', () => {
      const emitted: string[] = [];
      fixture.componentInstance.deskSelected.subscribe(id => emitted.push(id));
      desk('A4').click();
      expect(emitted).toEqual([]);
    });

    it('should emit the desk id when a free desk is clicked (AC4)', () => {
      const emitted: string[] = [];
      fixture.componentInstance.deskSelected.subscribe(id => emitted.push(id));
      desk('A3').click();
      expect(emitted).toEqual(['A3']);
    });

    it('should list the four states in a legend with text and icon (AC3)', () => {
      const items = Array.from(root.querySelectorAll('.legend li')).map(li => li.textContent ?? '');
      expect(items.length).toBe(4);
      for (const text of ['Available', 'Booked', 'Selected', 'Yours']) {
        expect(items.some(i => i.includes(text))).withContext(text).toBeTrue();
      }
    });
  });

  describe('selected and yours', () => {
    it('should mark the selected desk with aria-pressed true and "selected" in its name', () => {
      render({ signedIn: true, availability: allFree, selectedDesk: 'A2' });
      expect(desk('A2').getAttribute('aria-pressed')).toBe('true');
      expect(desk('A2').getAttribute('aria-label')).toBe('Desk A2, selected');
      expect(desk('A2').querySelector('.desk-state')?.textContent).toMatch(/Selected/);
      expect(desk('A3').getAttribute('aria-pressed')).toBe('false');
    });

    it('should mark the own desk as yours and selectable (spec 649 R3), not pressed by default', () => {
      const availability = ids.map(id => (id === 'B1' ? { id, booked: true, bookedBy: 'Ada Lovelace' } : { id, booked: false }));
      render({ signedIn: true, availability, yourDesk: 'B1' });
      expect(desk('B1').getAttribute('aria-label')).toBe('Desk B1, yours');
      expect(desk('B1').querySelector('.desk-state')?.textContent).toMatch(/Yours/);
      expect(desk('B1').disabled).toBeFalse();
      expect(desk('B1').getAttribute('aria-pressed')).toBe('false');
      expect(desk('B1').classList).not.toContain('picked');
    });

    it('should keep the own desk labelled yours with aria-pressed true when it is the selected desk', () => {
      const availability = ids.map(id => (id === 'B1' ? { id, booked: true, bookedBy: 'Ada Lovelace' } : { id, booked: false }));
      render({ signedIn: true, availability, yourDesk: 'B1', selectedDesk: 'B1' });
      expect(desk('B1').getAttribute('aria-pressed')).toBe('true');
      expect(desk('B1').getAttribute('aria-label')).toBe('Desk B1, yours');
      expect(desk('B1').querySelector('.desk-state')?.textContent).toMatch(/Yours/);
      expect(desk('B1').classList).toContain('yours');
      expect(desk('B1').classList).toContain('picked');
    });

    it('should show a selected desk as available with aria-pressed false after the selection is cleared', () => {
      render({ signedIn: true, availability: allFree, selectedDesk: 'A2' });
      fixture.componentRef.setInput('selectedDesk', null);
      fixture.detectChanges();
      expect(desk('A2').getAttribute('aria-pressed')).toBe('false');
      expect(desk('A2').getAttribute('aria-label')).toBe('Desk A2, available');
      expect(desk('A2').querySelector('.desk-state')?.textContent).toMatch(/Available/);
    });

    it('should not set aria-pressed on disabled desks', () => {
      render({ signedIn: false, availability: null });
      expect(desk('A1').hasAttribute('aria-pressed')).toBeFalse();
    });

    it('should not mark a desk booked by someone else as pressed even if it is the selected desk', () => {
      const availability = ids.map(id => (id === 'A4' ? { id, booked: true, bookedBy: 'Ana' } : { id, booked: false }));
      render({ signedIn: true, availability, selectedDesk: 'A4' });
      expect(desk('A4').disabled).toBeTrue();
      expect(desk('A4').hasAttribute('aria-pressed')).toBeFalse();
      expect(desk('A4').getAttribute('aria-label')).toBe('Desk A4, booked by Ana');
    });
  });

  describe('toggle (spec 649 AC2, AC8, AC9, AC10)', () => {
    const ownAvailability: DeskAvailability[] = ids.map(id =>
      id === 'B1' ? { id, booked: true, bookedBy: 'Ada Lovelace' } : id === 'A4' ? { id, booked: true, bookedBy: 'Ana' } : { id, booked: false }
    );
    let selected: string[];
    let deselected: number;

    function track(): void {
      selected = [];
      deselected = 0;
      fixture.componentInstance.deskSelected.subscribe(id => selected.push(id));
      fixture.componentInstance.deskDeselected.subscribe(() => deselected++);
    }

    it('should emit deskSelected and not deskDeselected when an unselected free desk is clicked', () => {
      render({ signedIn: true, availability: ownAvailability, yourDesk: 'B1' });
      track();
      desk('A3').click();
      expect(selected).toEqual(['A3']);
      expect(deselected).toBe(0);
    });

    it('should emit deskDeselected and not deskSelected when the selected desk is clicked', () => {
      render({ signedIn: true, availability: ownAvailability, yourDesk: 'B1', selectedDesk: 'A3' });
      track();
      desk('A3').click();
      expect(deselected).toBe(1);
      expect(selected).toEqual([]);
    });

    it('should emit deskSelected when another desk is clicked while one is selected', () => {
      render({ signedIn: true, availability: ownAvailability, yourDesk: 'B1', selectedDesk: 'A3' });
      track();
      desk('B4').click();
      expect(selected).toEqual(['B4']);
      expect(deselected).toBe(0);
    });

    it('should emit deskSelected when the own desk is clicked and it is not selected', () => {
      render({ signedIn: true, availability: ownAvailability, yourDesk: 'B1' });
      track();
      desk('B1').click();
      expect(selected).toEqual(['B1']);
      expect(deselected).toBe(0);
    });

    it('should emit deskDeselected when the selected own desk is clicked', () => {
      render({ signedIn: true, availability: ownAvailability, yourDesk: 'B1', selectedDesk: 'B1' });
      track();
      desk('B1').click();
      expect(deselected).toBe(1);
      expect(selected).toEqual([]);
    });

    it('should emit nothing when a desk booked by someone else is clicked', () => {
      render({ signedIn: true, availability: ownAvailability, yourDesk: 'B1', selectedDesk: 'A4' });
      track();
      desk('A4').click();
      expect(selected).toEqual([]);
      expect(deselected).toBe(0);
    });

    it('should emit nothing for neutral desks, also when a selection is still set', () => {
      render({ signedIn: true, availability: null, selectedDesk: 'A3' });
      track();
      desk('A3').click();
      desk('A1').click();
      expect(selected).toEqual([]);
      expect(deselected).toBe(0);
    });

    it('should render every desk as a native type=button element so Enter and Space toggle it', () => {
      render({ signedIn: true, availability: ownAvailability, yourDesk: 'B1', selectedDesk: 'A3' });
      for (const b of buttons()) {
        expect(b.tagName).toBe('BUTTON');
        expect(b.getAttribute('type')).toBe('button');
      }
      for (const id of ['A3', 'B1', 'B4']) {
        desk(id).focus();
        expect(document.activeElement).toBe(desk(id));
      }
      expect(desk('A3').getAttribute('aria-label')).toBe('Desk A3, selected');
    });
  });

  describe('not loaded yet', () => {
    it('should stay neutral when signed in but availability is not loaded', () => {
      render({ signedIn: true, availability: null });
      for (const b of buttons()) {
        expect(b.disabled).toBeTrue();
      }
    });

    it('should render no desks when the layout is empty', () => {
      render({ desks: [], signedIn: true, availability: [] });
      expect(buttons().length).toBe(0);
    });
  });

  describe('booker names are text only (spec 12)', () => {
    it('should not create elements from a name containing HTML', () => {
      const evil = '<img src=x onerror="window.__xss=1"><b>x</b>';
      const availability = ids.map(id => (id === 'A1' ? { id, booked: true, bookedBy: evil } : { id, booked: false }));
      render({ signedIn: true, availability });
      expect(root.querySelector('button.desk img')).toBeNull();
      expect(root.querySelector('button.desk b')).toBeNull();
      expect(desk('A1').querySelector('.desk-by')?.textContent).toBe(evil);
      expect((window as unknown as { __xss?: number }).__xss).toBeUndefined();
    });
  });
});
