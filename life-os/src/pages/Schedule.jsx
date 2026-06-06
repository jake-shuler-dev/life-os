import React, { useState } from "react";
import ScheduleCalendar from "./ScheduleCalendar.jsx";
import DailyRecurringTasks from "./DailyRecurringTasks.jsx";

export default function Schedule() {
  const [view, setView] = useState("calendar");
  return view === "calendar"
    ? <ScheduleCalendar view={view} setView={setView} />
    : <DailyRecurringTasks view={view} setView={setView} />;
}
