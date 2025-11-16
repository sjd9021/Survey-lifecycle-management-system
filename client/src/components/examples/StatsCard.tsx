import { StatsCard } from "../StatsCard";

export default function StatsCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
      <StatsCard label="Total Claims" value={47} trend={{ value: 12, direction: "up" }} />
      <StatsCard label="Survey Scheduled" value={23} trend={{ value: 5, direction: "up" }} />
      <StatsCard label="PLA Sent" value={15} trend={{ value: 3, direction: "down" }} />
    </div>
  );
}
