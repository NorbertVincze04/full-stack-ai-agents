import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { Desk, DeskAvailability } from '../booking.models';

type DeskState = 'neutral' | 'available' | 'booked' | 'selected' | 'yours';

interface DeskCell {
  id: string;
  label: string;
  row: number;
  col: number;
  state: DeskState;
  stateText: string;
  icon: string;
  bookedBy: string | null;
  enabled: boolean;
  accessibleName: string;
}

const STATE_TEXT: Record<Exclude<DeskState, 'neutral'>, string> = {
  available: 'Available',
  booked: 'Booked',
  selected: 'Selected',
  yours: 'Yours'
};

const STATE_ICON: Record<Exclude<DeskState, 'neutral'>, string> = {
  available: '\u2713',
  booked: '\u2715',
  selected: '\u25CF',
  yours: '\u2605'
};

@Component({
  selector: 'app-desk-plan',
  templateUrl: './desk-plan.component.html',
  styleUrl: './desk-plan.component.css'
})
export class DeskPlanComponent implements OnChanges {
  @Input() desks: Desk[] = [];
  // null = no state known (signed out or not loaded yet): desks are neutral and not selectable.
  @Input() availability: DeskAvailability[] | null = null;
  @Input() selectedDesk: string | null = null;
  @Input() yourDesk: string | null = null;
  @Input() signedIn = false;
  @Output() deskSelected = new EventEmitter<string>();

  readonly legend = (Object.keys(STATE_TEXT) as Exclude<DeskState, 'neutral'>[]).map(state => ({
    state,
    text: STATE_TEXT[state],
    icon: STATE_ICON[state]
  }));
  cells: DeskCell[] = [];

  ngOnChanges(): void {
    const byId = new Map((this.availability ?? []).map(a => [a.id, a]));
    this.cells = this.desks.map(desk => {
      const info = byId.get(desk.id);
      if (!this.availability || !info) {
        return this.cell(desk, 'neutral', null);
      }
      if (desk.id === this.yourDesk) {
        return this.cell(desk, 'yours', null);
      }
      if (info.booked) {
        return this.cell(desk, 'booked', info.bookedBy ?? null);
      }
      return this.cell(desk, desk.id === this.selectedDesk ? 'selected' : 'available', null);
    });
  }

  select(cell: DeskCell): void {
    if (cell.enabled) {
      this.deskSelected.emit(cell.id);
    }
  }

  private cell(desk: Desk, state: DeskState, bookedBy: string | null): DeskCell {
    const neutral = state === 'neutral';
    const stateText = neutral ? '' : STATE_TEXT[state];
    let accessibleName = `Desk ${desk.id}`;
    if (!neutral) {
      accessibleName += state === 'booked' && bookedBy ? `, booked by ${bookedBy}` : `, ${stateText.toLowerCase()}`;
    }
    return {
      id: desk.id,
      label: desk.label,
      row: desk.row,
      col: desk.col,
      state,
      stateText,
      icon: neutral ? '' : STATE_ICON[state],
      bookedBy,
      enabled: state === 'available' || state === 'selected',
      accessibleName
    };
  }
}
