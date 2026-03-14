import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../constants/colors";
import { fetchAISummary, fetchAllAttendance } from "../../lib/api";
import { getUid } from "../../lib/storage";

const TARGET_PCT = 95;

function pctColor(pct) {
  if (pct >= 75) return COLORS.present;
  if (pct >= 50) return COLORS.holiday;
  return COLORS.absent;
}

function computeStats(records) {
  const total = records.length;
  const present = records.filter((r) => r.status === "Present").length;
  const absent = records.filter((r) => r.status === "Absent").length;
  const holiday = records.filter((r) => r.status === "Holiday").length;
  const workdays = total - holiday;
  const percentage = workdays > 0 ? Number(((present / workdays) * 100).toFixed(2)) : 0;

  // Days needed to reach TARGET_PCT
  // (present + x) / (workdays + x) = TARGET_PCT/100  →  x = (TARGET_PCT*workdays - 100*present) / (100 - TARGET_PCT)
  const daysToTarget =
    percentage < TARGET_PCT
      ? Math.ceil((TARGET_PCT * workdays - 100 * present) / (100 - TARGET_PCT))
      : 0;

  // Streak
  const sorted = [...records]
    .filter((r) => r.status !== "Holiday")
    .sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  for (const r of sorted) {
    if (r.status === "Present") streak++;
    else break;
  }

  // Last 3 months breakdown
  const monthlyMap = {};
  records.forEach((r) => {
    const ym = r.date.slice(0, 7);
    if (!monthlyMap[ym]) monthlyMap[ym] = { present: 0, workdays: 0 };
    if (r.status !== "Holiday") monthlyMap[ym].workdays++;
    if (r.status === "Present") monthlyMap[ym].present++;
  });
  const monthly = Object.entries(monthlyMap)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 3)
    .map(([ym, val]) => ({
      ym,
      label: new Date(ym + "-01").toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      }),
      pct:
        val.workdays > 0 ? Math.round((val.present / val.workdays) * 100) : 0,
    }));

  // Semester range label
  const dates = records.map((r) => r.date).sort();
  const semStart = dates[0]
    ? new Date(dates[0]).toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
      })
    : null;
  const semEnd = dates[dates.length - 1]
    ? new Date(dates[dates.length - 1]).toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
      })
    : null;

  return {
    total,
    present,
    absent,
    holiday,
    percentage,
    daysToTarget,
    streak,
    monthly,
    semStart,
    semEnd,
  };
}

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const uid = await getUid();
      const records = await fetchAllAttendance(uid);
      setStats(computeStats(records));
      // setAiLoading(true);
    } catch (e) {
      console.log("Stats error:", e.message);
    } finally {
      setLoading(false);
      // setAiLoading(false)
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(true);
  }, [loadData]);

  if (loading) {
    return (
      <View
        style={[
          styles.centered,
          { paddingTop: insets.top },
          { paddingBottom: 34 + insets.bottom },
        ]}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Calculating stats...</Text>
      </View>
    );
  }

  const pc = pctColor(stats?.percentage || 0);

  const handleAi = async () => {
    try {
      setAiLoading(true);
      const uid = await getUid();
      const result = await fetchAISummary(uid);
      setAiSummary(result);
    } catch (error) {
      setAiSummary(`An error occurred: ${error.message ?? error}`);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={["#2d1250", "#1a0a2e", "#0F0E17"]}
      style={[styles.outer, { paddingTop: insets.top }]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* ── Title ─────────────────────────────────────────── */}
        <View style={styles.titleSection}>
          <Text style={styles.titleLabel}>Semester Progress</Text>
          {stats?.semStart && stats?.semEnd ? (
            <Text style={styles.titleRange}>
              {stats.semStart} – {stats.semEnd}
            </Text>
          ) : null}
        </View>

        {/* ── Overall Attendance Card ────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.overallLabel}>OVERALL ATTENDANCE</Text>
          <Text style={[styles.bigPct, { color: pc }]}>
            {stats?.percentage ?? 0}
            <Text style={styles.bigPctSym}>%</Text>
          </Text>

          {/* Progress bar */}
          <View style={styles.barBg}>
            <LinearGradient
              colors={[pc, pc + "88"]}
              style={[
                styles.barFill,
                { width: `${Math.min(stats?.percentage ?? 0, 100)}%` },
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>

          {/* Target hint */}
          {stats?.daysToTarget > 0 ? (
            <Text style={styles.targetHint}>
              {stats.daysToTarget} more day{stats.daysToTarget !== 1 ? "s" : ""}{" "}
              to reach {TARGET_PCT}% target
            </Text>
          ) : (
            <Text style={[styles.targetHint, { color: COLORS.present }]}>
              Target achieved!
            </Text>
          )}
        </View>

        {/* ── Stat Boxes ────────────────────────────────────── */}
        <View style={styles.statRow}>
          {[
            { val: stats?.present, label: "PRESENT", color: COLORS.present },
            { val: stats?.absent, label: "ABSENT", color: "#f97316" },
            { val: stats?.holiday, label: "HOLIDAY", color: COLORS.holiday },
          ].map((s) => (
            <View key={s.label} style={styles.statBox}>
              <Text style={[styles.statVal, { color: s.color }]}>
                {String(s.val ?? 0).padStart(2, "0")}
              </Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Active Streak ─────────────────────────────────── */}
        <LinearGradient
          colors={["#d97706", "#f59e0b", "#fbbf24"]}
          style={styles.streakCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.streakIconCircle}>
            <Ionicons name="flame" size={24} color="#d97706" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.streakTitle}>Active Streak</Text>
            <Text style={styles.streakSub}>
              {stats?.streak ?? 0} day{stats?.streak !== 1 ? "s" : ""} without
              an absence
            </Text>
          </View>
          <Text style={styles.streakNum}>{stats?.streak ?? 0}</Text>
        </LinearGradient>

        {/* ── Monthly Status ────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.monthHeader}>
            <Text style={styles.monthTitle}>Monthly Status</Text>
          </View>
          {stats?.monthly?.length > 0 ? (
            stats.monthly.map((m) => {
              const mc = pctColor(m.pct);
              return (
                <View key={m.ym} style={styles.monthRow}>
                  <View style={styles.monthMeta}>
                    <Text style={styles.monthLabel}>{m.label}</Text>
                    <Text style={[styles.monthPct, { color: mc }]}>
                      {m.pct}%
                    </Text>
                  </View>
                  <View style={styles.monthBarBg}>
                    <LinearGradient
                      colors={[mc, mc + "88"]}
                      style={[styles.monthBarFill, { width: `${m.pct}%` }]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    />
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>No records yet</Text>
          )}
        </View>

        {/* ── Gemini AI Insights ────────────────────────────── */}
        <View style={[styles.card, styles.aiCard]}>
          <View style={styles.aiTitleRow}>
            <LinearGradient
              colors={[COLORS.primaryDark, COLORS.primary]}
              style={styles.aiBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="hardware-chip-outline" size={11} color="#fff" />
              <Text style={styles.aiBadgeText}> GEMINI AI</Text>
            </LinearGradient>
            <Pressable style={styles.aiButton} onPress={handleAi}>
              <Text className ="bg-violet-600 p-3 border" style={styles.aiInsightsLabel}>Generate Insights</Text>
            </Pressable>
          </View>
          {aiLoading ? (
            <ActivityIndicator
              color={COLORS.primaryLight}
              style={{ marginTop: 16 }}
            />
          ) : aiSummary ? (
            <Text style={styles.aiText}>{aiSummary}</Text>
          ) : null}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },
  loadingText: { color: COLORS.textSecondary, marginTop: 12 },
  // Extra bottom padding so content clears the floating tab bar
  scroll: { paddingBottom: 100, paddingHorizontal: 16 },

  // Title — bigger top breathing room, stronger hierarchy
  titleSection: { alignItems: "center", paddingTop: 24, paddingBottom: 22 },
  titleLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.45)",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  titleRange: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    marginTop: 4,
    letterSpacing: 0.3,
  },

  // Card base — glassmorphism border + subtle shadow
  card: {
    backgroundColor: "rgba(26,26,46,0.92)",
    borderRadius: 20,
    padding: 22,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },

  // Overall
  overallLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.45)",
    letterSpacing: 1.5,
    textAlign: "center",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  bigPct: {
    fontSize: 80,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 88,
  },
  bigPctSym: { fontSize: 40, fontWeight: "700" },
  barBg: {
    height: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 5,
    marginTop: 14,
    marginBottom: 10,
    overflow: "hidden",
  },
  barFill: { height: 10, borderRadius: 5 },
  targetHint: {
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
    marginTop: 2,
  },

  // Stat boxes — distinct tinted background + top accent line per color
  statRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  statBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  statVal: { fontSize: 32, fontWeight: "900" },
  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 1.2,
    marginTop: 5,
    textTransform: "uppercase",
  },

  // Streak — warm amber glow shadow
  streakCard: {
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 14,
    shadowColor: "#f59e0b",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
  streakIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.22)",
    justifyContent: "center",
    alignItems: "center",
  },
  streakTitle: { fontSize: 16, fontWeight: "800", color: "#fff" },
  streakSub: { fontSize: 12, color: "rgba(255,255,255,0.72)", marginTop: 2 },
  streakNum: {
    fontSize: 38,
    fontWeight: "900",
    color: "#fff",
    opacity: 0.95,
  },

  // Monthly
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  monthTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },
  monthRow: { marginBottom: 14 },
  monthMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  monthLabel: { fontSize: 14, color: "rgba(255,255,255,0.65)" },
  monthPct: { fontSize: 14, fontWeight: "700" },
  monthBarBg: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 4,
    overflow: "hidden",
  },
  monthBarFill: { height: 8, borderRadius: 4 },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: "center",
    paddingVertical: 16,
  },

  // AI card — purple glow + top accent border
  aiCard: {
    borderTopWidth: 2,
    borderTopColor: COLORS.primary,
    borderLeftWidth: 0,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 7,
  },
  aiTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.8,
  },
  aiButton:{
    backgroundColor:COLORS.primaryDark,
    paddingVertical:5,
    paddingHorizontal:9,
    borderRadius:8,
    marginStart:"auto",

  },
  aiInsightsLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.8,
  },
  aiText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.62)",
    lineHeight: 23,
  },
});
