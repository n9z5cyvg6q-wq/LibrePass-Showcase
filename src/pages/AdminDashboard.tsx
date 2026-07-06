import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, Activity, Car, TrendingUp, Users, ArrowLeft, Box, ChevronRight } from "lucide-react";
import { getAvailabilityColor } from "@/data/parkings";
import { useAdminRole } from "@/hooks/useAdminRole";

interface DailySession {
  date: string;
  count: number;
}

interface ParkingOccupancy {
  name: string;
  available: number;
  total: number;
  occupancy: number;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminRole();
  const [dailySessions, setDailySessions] = useState<DailySession[]>([]);
  const [occupancy, setOccupancy] = useState<ParkingOccupancy[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [activeNow, setActiveNow] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);

  // Fetch dashboard data
  useEffect(() => {
    if (adminLoading || !isAdmin) return;

    const fetchData = async () => {
      // Sessions per day (last 14 days)
      const { data: sessions } = await supabase
        .from("sessions")
        .select("start_time, total_price, end_time")
        .gte("start_time", new Date(Date.now() - 14 * 86400000).toISOString())
        .order("start_time", { ascending: true });

      if (sessions) {
        const byDay: Record<string, number> = {};
        let revenue = 0;
        let active = 0;

        sessions.forEach((s) => {
          const day = new Date(s.start_time).toLocaleDateString("en-CH", { weekday: "short", day: "numeric" });
          byDay[day] = (byDay[day] || 0) + 1;
          revenue += Number(s.total_price) || 0;
          if (!s.end_time) active++;
        });

        setDailySessions(Object.entries(byDay).map(([date, count]) => ({ date, count })));
        setTotalSessions(sessions.length);
        setActiveNow(active);
        setTotalRevenue(revenue);
      }

      // Live occupancy
      const { data: parkings } = await supabase
        .from("parkings")
        .select("name, available_spaces, total_capacity");

      if (parkings) {
        setOccupancy(
          parkings.map((p) => ({
            name: p.name.replace("Parking ", ""),
            available: p.available_spaces,
            total: p.total_capacity,
            occupancy: Math.round(((p.total_capacity - p.available_spaces) / p.total_capacity) * 100),
          }))
        );
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [adminLoading, isAdmin]);

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6">
        <ShieldAlert size={48} className="text-destructive" />
        <h1 className="text-xl font-bold text-foreground">Access Denied</h1>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          You don't have administrator privileges. Contact the system admin to request access.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm"
        >
          Back to App
        </button>
      </div>
    );
  }

  const avgOccupancy = occupancy.length > 0
    ? Math.round(occupancy.reduce((s, o) => s + o.occupancy, 0) / occupancy.length)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/70 backdrop-blur-2xl backdrop-saturate-150 border-b border-border/40">
        <div className="flex items-center gap-3 px-4 py-3 max-w-4xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center active:scale-95 transition-transform"
          >
            <ArrowLeft size={18} className="text-foreground" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">Admin Dashboard</h1>
            <p className="text-[11px] text-muted-foreground">LibrePass · Lausanne Operations</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Car, label: "Total Sessions", value: totalSessions.toString(), color: "text-primary" },
            { icon: Activity, label: "Active Now", value: activeNow.toString(), color: "text-emerald-500" },
            { icon: TrendingUp, label: "Revenue (14d)", value: `CHF ${totalRevenue.toFixed(0)}`, color: "text-amber-500" },
            { icon: Users, label: "Avg Occupancy", value: `${avgOccupancy}%`, color: "text-blue-500" },
          ].map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl p-4 shadow-sm"
            >
              <kpi.icon size={18} className={`${kpi.color} mb-2`} />
              <p className="text-2xl font-bold text-card-foreground tracking-tight">{kpi.value}</p>
              <p className="text-[11px] text-muted-foreground font-medium">{kpi.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Sessions per Day Chart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl p-5 shadow-sm"
        >
          <h2 className="text-sm font-bold text-card-foreground mb-4">Parking Sessions per Day</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySessions} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                    fontSize: "12px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                  labelStyle={{ fontWeight: 700, color: "hsl(var(--card-foreground))" }}
                />
                <Bar dataKey="count" name="Sessions" radius={[6, 6, 0, 0]} fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Live Occupancy */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-card-foreground">Live Occupancy</h2>
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-dot" />
              Real-time
            </span>
          </div>
          <div className="space-y-3">
            {occupancy.map((p, i) => {
              const color = getAvailabilityColor(p.available, p.total);
              return (
                <motion.div
                  key={p.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-card-foreground">{p.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {p.available}/{p.total}
                      </span>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: color + "18", color }}
                      >
                        {p.occupancy}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${p.occupancy}%` }}
                      transition={{ duration: 0.8, delay: 0.3 + i * 0.05 }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-card rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-card-foreground">Admin Tools</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Manage 3D spot hit-boxes and per-parking splat pre-bakes.
              </p>
            </div>
            <button
              onClick={() => navigate("/admin/spots")}
              className="inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80"
            >
              <Box size={16} />
              Spot Editor
              <ChevronRight size={14} />
            </button>
          </div>
        </motion.div>

        <p className="text-center text-[10px] text-muted-foreground pb-6">
          Data refreshes every 30 seconds · LibrePass Admin v1.0.4-Alpha
        </p>
      </div>
    </div>
  );
};

export default AdminDashboard;
