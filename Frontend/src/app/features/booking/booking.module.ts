import { NgModule } from '@angular/core';
import { BookingComponent } from './booking.component';
import { BookingRoutingModule } from './booking-routing.module';
import { CalendarComponent } from './calendar/calendar.component';
import { DeskPlanComponent } from './desk-plan/desk-plan.component';

@NgModule({
  declarations: [BookingComponent, CalendarComponent, DeskPlanComponent],
  imports: [BookingRoutingModule]
})
export class BookingModule { }
