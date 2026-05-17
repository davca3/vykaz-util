use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CalendarEvent {
    pub day: u32,
    pub title: String,
    pub is_half_day: bool,
    /// "vacation" (D) or "compTime" (NV) — best-guess from title keywords.
    pub event_type: String,
}

#[cfg(target_os = "macos")]
mod macos {
    use super::CalendarEvent;
    use objc2::rc::Retained;
    use objc2::runtime::Bool;
    use objc2_event_kit::EKEventStore;
    use objc2_foundation::{NSCalendar, NSCalendarUnit, NSDate, NSDateComponents, NSError};
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

    /// Extract (year, month, day) of an NSDate in the current calendar.
    fn date_to_ymd(date: &NSDate) -> (i32, i32, i32) {
        let calendar = NSCalendar::currentCalendar();
        let units = NSCalendarUnit::Year | NSCalendarUnit::Month | NSCalendarUnit::Day;
        let comps = calendar.components_fromDate(units, date);
        (
            comps.year() as i32,
            comps.month() as i32,
            comps.day() as i32,
        )
    }

    /// Insert an event for a day, preferring half-day over full-day on conflict.
    fn upsert_event(
        result: &mut Vec<CalendarEvent>,
        day: u32,
        title: &str,
        is_half_day: bool,
        event_type: &str,
    ) {
        if let Some(existing) = result.iter_mut().find(|e| e.day == day) {
            // Prefer half-day on conflict (more specific).
            if !existing.is_half_day && is_half_day {
                existing.is_half_day = true;
                existing.title = title.to_string();
                existing.event_type = event_type.to_string();
            }
        } else {
            result.push(CalendarEvent {
                day,
                title: title.to_string(),
                is_half_day,
                event_type: event_type.to_string(),
            });
        }
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

        // Keywords that mark an event as a vacation/time-off entry.
        let vacation_keywords = [
            "dovolená", "dovolen", "vacation", "ooo", "pto", "holiday",
            "time off", "day off", "volno",
        ];
        // Keywords for compensatory leave (NV - náhradní volno).
        let comp_time_keywords = [
            "náhradní volno", "nahradni volno", "comp time", "comp day",
            "comp leave", "compensatory", "toil", "lieu",
        ];
        // Keywords that narrow the event down to half a day.
        let half_day_keywords = [
            "půl", "pul", "1/2", "polovina", "half", "0.5", "0,5",
        ];
        // Half-day threshold for timed (non-all-day) events.
        const HALF_DAY_MAX_HOURS: f64 = 5.0;

        let mut result: Vec<CalendarEvent> = Vec::new();
        let max_day = days_in_month(year, month);

        for event in events.iter() {
            let title = unsafe { event.title() };
            let title_str = title.to_string();
            let title_lower = title_str.to_lowercase();
            let is_comp_time = comp_time_keywords.iter().any(|kw| title_lower.contains(kw));
            let is_vacation = vacation_keywords.iter().any(|kw| title_lower.contains(kw));
            if !is_comp_time && !is_vacation {
                continue;
            }
            // Comp-time wins when both match (more specific).
            let event_type = if is_comp_time { "compTime" } else { "vacation" };

            let is_all_day = unsafe { event.isAllDay() };
            let event_start: Retained<NSDate> = unsafe { event.startDate() };
            let event_end: Retained<NSDate> = unsafe { event.endDate() };
            let has_half_keyword = half_day_keywords.iter().any(|kw| title_lower.contains(kw));

            if is_all_day {
                // All-day event: half-day only when explicitly named so.
                let is_half_day = has_half_keyword;
                for d in 1..=max_day {
                    if let Some(check_date) = create_date(year, month, d as i32) {
                        let after_start = check_date.compare(&event_start)
                            != objc2_foundation::NSComparisonResult::Ascending;
                        let before_end = check_date.compare(&event_end)
                            == objc2_foundation::NSComparisonResult::Ascending;
                        if after_start && before_end {
                            upsert_event(&mut result, d, &title_str, is_half_day, event_type);
                        }
                    }
                }
            } else {
                // Timed event: figure out the calendar day from the start time.
                let (sy, sm, sd) = date_to_ymd(&event_start);
                if sy != year || sm != month || sd < 1 || (sd as u32) > max_day {
                    continue;
                }
                let duration_hours =
                    event_end.timeIntervalSinceDate(&event_start) / 3600.0;
                // Half-day either by duration or by keyword in title.
                let is_half_day = duration_hours <= HALF_DAY_MAX_HOURS || has_half_keyword;
                upsert_event(&mut result, sd as u32, &title_str, is_half_day, event_type);
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
