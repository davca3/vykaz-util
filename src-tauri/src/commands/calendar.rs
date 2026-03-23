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
        components.setHour(0);
        components.setMinute(0);
        components.setSecond(0);
        calendar.dateFromComponents(&components)
    }

    pub fn request_access() -> Result<bool, String> {
        let store = unsafe { EKEventStore::new() };
        let (tx, rx) = mpsc::channel();

        let block = block2::RcBlock::new(move |granted: Bool, _error: *mut NSError| {
            let _ = tx.send(granted.as_bool());
        });

        // Convert RcBlock to raw pointer for the API
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
        let calendar = NSCalendar::currentCalendar();
        let timezone = NSTimeZone::localTimeZone();

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
            let start_components = calendar.componentsInTimeZone_fromDate(&timezone, &event_start);
            let day = start_components.day() as u32;

            let event_end: Retained<NSDate> = unsafe { event.endDate() };
            let end_components = calendar.componentsInTimeZone_fromDate(&timezone, &event_end);
            let end_day = end_components.day() as u32;
            let end_month = end_components.month() as i32;

            // For multi-day all-day events, end date is day after last day
            let last_day = if end_month != month {
                31
            } else {
                end_day.saturating_sub(1).max(day)
            };

            for d in day..=last_day {
                if !result.iter().any(|e: &CalendarEvent| e.day == d) {
                    result.push(CalendarEvent {
                        day: d,
                        title: title_str.clone(),
                    });
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
