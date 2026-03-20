import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../constants/colors";
import {
  fetchAllAttendance,
  refreshAttendance,
  updateAttendance,
  updateHoliday,
} from "../../lib/api";
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
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Calendar & marking state
  const [selectedDate, setSelectedDate] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [reasonModal, setReasonModal] = useState(false);
  const [reasonType, setReasonType] = useState(null); // "Absent" or "Holiday"
  const [reason, setReason] = useState("");

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const uid = await getUid();
      let data;
      if (isRefresh) {
        data = await refreshAttendance(uid);
      } else {
        data = await fetchAllAttendance(uid);
      }
      setRecords(data);
      setStats(computeStats(data));
    } catch (e) {
      console.log("Stats error:", e.message);
    } finally {
      setLoading(false);
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

  // Build calendar marked-dates object
  const markedDates = {};
  records.forEach((r) => {
    let dotColor = COLORS.neutral;
    if (r.status === "Present") dotColor = COLORS.present;
    else if (r.status === "Absent") dotColor = COLORS.absent;
    else if (r.status === "Holiday") dotColor = COLORS.holiday;
    markedDates[r.date] = { marked: true, dotColor };
  });
  if (selectedDate) {
    markedDates[selectedDate] = {
      ...markedDates[selectedDate],
      selected: true,
      selectedColor: COLORS.primary,
    };
  }

  const selectedRecord = selectedDate
    ? records.find((r) => r.date === selectedDate) || null
    : null;

  // Mark attendance for a selected date
  async function handleMark(status, reasonText) {
    if (!selectedDate) return;
    setReasonModal(false);
    setActionLoading(status);

    // Haptic feedback
    if (status === "Present") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    else if (status === "Absent") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const uid = await getUid();
      if (status === "Holiday") {
        await updateHoliday(uid, selectedDate, reasonText || "Declared by user");
      } else {
        await updateAttendance(uid, status, reasonText || "-", selectedDate);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await loadData(true);
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", e.message || "Failed to mark attendance.");
    } finally {
      setActionLoading(null);
    }
  }

  function openReasonModal(type) {
    setReasonType(type);
    setReason("");
    setReasonModal(true);
  }

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

  const selectedDateDisplay = selectedDate
    ? new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

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

        {/* ── Mark Attendance Section ─────────────────────────── */}
        <View style={styles.markSection}>
          <View style={styles.markHeader}>
            <Ionicons name="create-outline" size={20} color={COLORS.primaryLight} />
            <Text style={styles.markTitle}>Mark Attendance</Text>
          </View>
          <Text style={styles.markSubtitle}>
            Select a date and mark your attendance
          </Text>
        </View>

        {/* Calendar */}
        <View style={styles.calendarWrap}>
          <Calendar
            markedDates={markedDates}
            markingType="dot"
            onDayPress={(day) => setSelectedDate(day.dateString)}
            theme={{
              backgroundColor: "transparent",
              calendarBackground: COLORS.card,
              textSectionTitleColor: COLORS.textSecondary,
              selectedDayBackgroundColor: COLORS.primary,
              selectedDayTextColor: "#fff",
              todayTextColor: COLORS.primaryLight,
              todayBackgroundColor: COLORS.overlay,
              dayTextColor: COLORS.textPrimary,
              textDisabledColor: COLORS.textMuted,
              arrowColor: COLORS.primary,
              monthTextColor: COLORS.textPrimary,
              textDayFontWeight: "600",
              textMonthFontWeight: "800",
              textDayHeaderFontWeight: "600",
              textDayFontSize: 14,
              textMonthFontSize: 17,
              textDayHeaderFontSize: 12,
            }}
          />
        </View>

        {/* Selected date detail & actions */}
        {selectedDate && (
          <View style={styles.selectedSection}>
            {/* Date display */}
            <View style={styles.selectedDateRow}>
              <Ionicons name="calendar-outline" size={18} color={COLORS.primaryLight} />
              <Text style={styles.selectedDateText}>{selectedDateDisplay}</Text>
            </View>

            {/* Current status badge */}
            {selectedRecord ? (
              <View style={[
                styles.currentStatusBadge,
                {
                  borderColor:
                    selectedRecord.status === "Present" ? COLORS.present
                    : selectedRecord.status === "Absent" ? COLORS.absent
                    : COLORS.holiday,
                },
              ]}>
                <Ionicons
                  name={
                    selectedRecord.status === "Present" ? "checkmark-circle"
                    : selectedRecord.status === "Absent" ? "close-circle"
                    : "sunny"
                  }
                  size={16}
                  color={
                    selectedRecord.status === "Present" ? COLORS.present
                    : selectedRecord.status === "Absent" ? COLORS.absent
                    : COLORS.holiday
                  }
                />
                <Text style={[
                  styles.currentStatusText,
                  {
                    color:
                      selectedRecord.status === "Present" ? COLORS.present
                      : selectedRecord.status === "Absent" ? COLORS.absent
                      : COLORS.holiday,
                  },
                ]}>
                  Currently: {selectedRecord.status}
                </Text>
                {selectedRecord.reason && selectedRecord.reason !== "-" && (
                  <Text style={styles.currentReasonText}>
                    — {selectedRecord.reason}
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.currentStatusBadge}>
                <Ionicons name="help-circle-outline" size={16} color={COLORS.textMuted} />
                <Text style={[styles.currentStatusText, { color: COLORS.textMuted }]}>
                  No record for this date
                </Text>
              </View>
            )}

            {/* Action buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.actionBtnWrap}
                onPress={() => handleMark("Present", "Present")}
                disabled={!!actionLoading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={["#14532d", "#166534"]}
                  style={styles.actionBtn}
                >
                  {actionLoading === "Present" ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={28} color="#4ade80" />
                      <Text style={styles.actionLabel}>Present</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtnWrap}
                onPress={() => openReasonModal("Absent")}
                disabled={!!actionLoading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={["#450a0a", "#7f1d1d"]}
                  style={styles.actionBtn}
                >
                  {actionLoading === "Absent" ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="close-circle" size={28} color="#f87171" />
                      <Text style={styles.actionLabel}>Absent</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.holidayWrap}
              onPress={() => openReasonModal("Holiday")}
              disabled={!!actionLoading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#451a03", "#78350f"]}
                style={styles.holidayBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {actionLoading === "Holiday" ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="sunny" size={22} color="#fbbf24" />
                    <Text style={styles.actionLabel}>Holiday</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ── Reason Modal (for Absent & Holiday) ──────────────── */}
      <Modal
        visible={reasonModal}
        transparent
        animationType="slide"
        onRequestClose={() => setReasonModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <LinearGradient
              colors={["#1a0a2e", COLORS.card]}
              style={styles.modalGrad}
            >
              <Text style={styles.modalTitle}>
                {reasonType === "Absent" ? "Why Absent?" : "Holiday Reason"}
              </Text>
              <Text style={styles.modalSub}>
                {reasonType === "Absent"
                  ? "Add a reason for your absence"
                  : "Add a reason for this holiday"}
              </Text>

              {selectedDateDisplay && (
                <View style={styles.modalDateRow}>
                  <Ionicons name="calendar-outline" size={14} color={COLORS.primaryLight} />
                  <Text style={styles.modalDateText}>{selectedDateDisplay}</Text>
                </View>
              )}

              <TextInput
                style={styles.modalInput}
                placeholder={
                  reasonType === "Absent"
                    ? "e.g. Sick, Family function…"
                    : "e.g. National holiday, College event…"
                }
                placeholderTextColor={COLORS.textMuted}
                value={reason}
                onChangeText={setReason}
                multiline
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => {
                    setReasonModal(false);
                    setReason("");
                  }}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSubmitBtn}
                  onPress={() => {
                    const r = reason.trim() || "-";
                    setReason("");
                    handleMark(reasonType, r);
                  }}
                >
                  <LinearGradient
                    colors={
                      reasonType === "Absent"
                        ? ["#7f1d1d", "#991b1b"]
                        : ["#78350f", "#92400e"]
                    }
                    style={styles.modalSubmitGrad}
                  >
                    <Text style={styles.modalSubmitText}>
                      Mark {reasonType}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>
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
  scroll: { paddingBottom: 100, paddingHorizontal: 16 },

  // Title
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

  // Card base
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

  // Stat boxes
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

  // Streak
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

  // ── Mark Attendance Section ──
  markSection: {
    marginTop: 10,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  markHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  markTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
  },
  markSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
  },

  // Calendar
  calendarWrap: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // Selected section
  selectedSection: {
    backgroundColor: "rgba(26,26,46,0.92)",
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.25)",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  selectedDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  selectedDateText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  currentStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  currentStatusText: {
    fontSize: 13,
    fontWeight: "700",
  },
  currentReasonText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    flexShrink: 1,
  },

  // Action buttons
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  actionBtnWrap: { flex: 1 },
  actionBtn: { borderRadius: 16, padding: 18, alignItems: "center", gap: 6 },
  actionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.9)",
  },
  holidayWrap: {},
  holidayBtn: {
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  modalGrad: { padding: 28, paddingBottom: 44 },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  modalSub: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 14 },
  modalDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(124,58,237,0.15)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  modalDateText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primaryLight,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 14,
    padding: 14,
    color: COLORS.textPrimary,
    backgroundColor: "rgba(255,255,255,0.05)",
    fontSize: 14,
    minHeight: 90,
    textAlignVertical: "top",
    marginBottom: 18,
  },
  modalButtons: { flexDirection: "row", gap: 12 },
  modalCancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: { color: COLORS.textSecondary, fontWeight: "600" },
  modalSubmitBtn: { flex: 1, borderRadius: 14, overflow: "hidden" },
  modalSubmitGrad: { padding: 14, alignItems: "center" },
  modalSubmitText: { color: "#fff", fontWeight: "700" },
});
