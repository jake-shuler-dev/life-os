import React, { useState } from "react";
import ScheduleCalendar from "./ScheduleCalendar.jsx";
import DailyRecurringTasks from "./DailyRecurringTasks.jsx";

export default function Schedule() {
  const [view, setView] = useState("all");
  if (view === "tasks") return <DailyRecurringTasks view={view} setView={setView} />;
  return <ScheduleCalendar view={view} setView={setView} />;
}
