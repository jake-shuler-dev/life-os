import React, { useState } from "react";
import FinanceDashboard from "./FinanceDashboard.jsx";
import FinanceEntry from "./FinanceEntry.jsx";
import FinanceSubscriptions from "./FinanceSubscriptions.jsx";

export default function Finance() {
  const [view, setView] = useState("dashboard");
  const [scope, setScope] = useState("monthly");
  const [origin, setOrigin] = useState("dashboard");
  const openSubs = (s, o) => { setScope(s); setOrigin(o); setView("subs"); };
  if (view === "subs") return <FinanceSubscriptions scope={scope} onBack={() => setView(origin)} />;
  if (view === "edit") return <FinanceEntry onBack={() => setView("dashboard")} onOpenSubs={(s) => openSubs(s, "edit")} />;
  return <FinanceDashboard onEdit={() => setView("edit")} onOpenSubs={(s) => openSubs(s, "dashboard")} />;
}
