use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
pub struct CalendarEvent {
    pub day: u32,
    pub title: String,
}

#[cfg(target_os = "macos")]
mod macos {
    use super::CalendarEvent;
    use objc2::rc::Retained;
    use objc2::runtime::Bool;
    use objc2_event_kit::EKEventStore;
    use objc2_foundation::{NSCalendar, NSDate, NSDateComponents, NSError, NSTimeZone};
    use std::sync::mpsc;

    fn create_date(year: i32, month: i32, day: i32) -> Option<Retained<NSDate>> {
        let calendar = NSCalendar::currentCalendar();
        let components = NSDateComponents::new();
        components.setYear(year as isize);
        components.setMonth(month as isize);
        components.setDay(day as isize);
        components.setHour(12); // Noon to avoid timezone edge cases
        components.setMinute(0);
        components.setSecond(0);
        calendar.dateFromComponents(&components)
    }

    fn days_in_month(year: i32, month: i32) -> u32 {
        let calendar = NSCalendar::currentCalendar();
        let components = NSDateComponents::new();
        components.setYear(year as isize);
        components.setMonth(month as isize);
        components.setDay(1);
        if let Some(date) = calendar.dateFromComponents(&components) {
            let range = calendar.rangeOfUnit_inUnit_forDate(
                objc2_foundation::NSCalendarUnit::Day,
                objc2_foundation::NSCalendarUnit::Month,
                &date,
            );
            return range.length as u32;
        }
        31
    }

    pub fn request_access() -> Result<bool, String> {
        let store = unsafe { EKEventStore::new() };
        let (tx, rx) = mpsc::channel();

        let block = block2::RcBlock::new(move |granted: Bool, _error: *mut NSError| {
            let _ = tx.send(granted.as_bool());
        });

        let block_ptr: *mut block2::DynBlock<dyn Fn(Bool, *mut NSError)> =
            &*block as *const _ as *mut _;

        unsafe {
            store.requestFullAccessToEventsWithCompletion(block_ptr);
        }

        rx.recv().map_err(|e| format!("Chyba při žádosti o přístup: {}", e))
    }

    pub fn read_events(year: i32, month: i32) -> Result<Vec<CalendarEvent>, String> {
        let store = unsafe { EKEventStore::new() };

        let start_date = create_date(year, month, 1)
            .ok_or("Nelze vytvořit počáteční datum")?;

        let next_month = if month == 12 { 1 } else { month + 1 };
        let next_year = if month == 12 { year + 1 } else { year };
        let end_date = create_date(next_year, next_month, 1)
            .ok_or("Nelze vytvořit koncové datum")?;

        let predicate = unsafe {
            store.predicateForEventsWithStartDate_endDate_calendars(
                &start_date,
                &end_date,
                None,
            )
        };

        let events = unsafe { store.eventsMatchingPredicate(&predicate) };

        let keywords = [
            "dovolená", "dovolen", "vacation", "ooo", "pto", "holiday",
            "time off", "day off", "volno",
        ];

        let mut result = Vec::new();
        let max_day = days_in_month(year, month);

        for event in events.iter() {
            let is_all_day = unsafe { event.isAllDay() };
            if !is_all_day {
                continue;
            }

            let title = unsafe { event.title() };
            let title_str = title.to_string();
            let title_lower = title_str.to_lowercase();
            let is_vacation = keywords.iter().any(|kw| title_lower.contains(kw));

            if !is_vacation {
                continue;
            }

            let event_start: Retained<NSDate> = unsafe { event.startDate() };
            let event_end: Retained<NSDate> = unsafe { event.endDate() };

            // Check each day of the month against the event range
            // This is more robust than day-number arithmetic with timezone issues
            for d in 1..=max_day {
                if result.iter().any(|e: &CalendarEvent| e.day == d) {
                    continue;
                }

                // Create a date for noon on this day (avoid timezone edge cases)
                if let Some(check_date) = create_date(year, month, d as i32) {
                    // check_date >= event_start AND check_date < event_end
                    let after_start = check_date.compare(&event_start) != objc2_foundation::NSComparisonResult::Ascending;
                    let before_end = check_date.compare(&event_end) == objc2_foundation::NSComparisonResult::Ascending;

                    if after_start && before_end {
                        result.push(CalendarEvent {
                            day: d,
                            title: title_str.clone(),
                        });
                    }
                }
            }
        }

        result.sort_by_key(|e| e.day);
        Ok(result)
    }
}

#[cfg(not(target_os = "macos"))]
mod macos {
    use super::CalendarEvent;

    pub fn request_access() -> Result<bool, String> {
        Err("Kalendářová integrace je dostupná pouze na macOS".to_string())
    }

    pub fn read_events(_year: i32, _month: i32) -> Result<Vec<CalendarEvent>, String> {
        Err("Kalendářová integrace je dostupná pouze na macOS".to_string())
    }
}

#[tauri::command]
pub fn request_calendar_access() -> Result<bool, String> {
    macos::request_access()
}

#[tauri::command]
pub fn read_vacation_events(year: i32, month: i32) -> Result<Vec<CalendarEvent>, String> {
    macos::read_events(year, month)
}
