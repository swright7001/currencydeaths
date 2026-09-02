import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.weekly(
  "refresh approved FRED dollar series",
  { dayOfWeek: "monday", hourUTC: 14, minuteUTC: 0 },
  internal.dollarMetricRefresh.run,
  { mode: "scheduled" },
);

export default crons;
