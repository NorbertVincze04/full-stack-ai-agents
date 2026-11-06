import { NgModule } from '@angular/core';
import { BookingComponent } from './booking.component';
import { BookingRoutingModule } from './booking-routing.module';
import { CalendarComponent } from './calendar/calendar.component';

@NgModule({
  declarations: [BookingComponent, CalendarComponent],
  imports: [BookingRoutingModule]
})
export class BookingModule { }
