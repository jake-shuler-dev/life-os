import React, { useState } from "react";
import FinanceDashboard from "./FinanceDashboard.jsx";
import FinanceEntry from "./FinanceEntry.jsx";

export default function Finance() {
  const [view, setView] = useState("dashboard");
  return view === "dashboard"
    ? <FinanceDashboard onEdit={() => setView("edit")} />
    : <FinanceEntry onBack={() => setView("dashboard")} />;
}
