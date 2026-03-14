import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../constants/colors";
import { fetchAllAttendance } from "../../lib/api";
import { getUid } from "../../lib/storage";

function getStatusConfig(status) {
  if (status === "Present")
    return {
      color: COLORS.present,
      icon: "checkmark-circle",
      grad: ["#052e16", "#14532d"],
    };
  if (status === "Absent")
    return {
      color: COLORS.absent,
      icon: "close-circle",
      grad: ["#200000", "#450a0a"],
    };
  if (status === "Holiday")
    return {
      color: COLORS.holiday,
      icon: "sunny",
      grad: ["#271900", "#451a03"],
    };
  return {
    color: COLORS.neutral,
    icon: "help-circle-outline",
    grad: [COLORS.card, COLORS.cardAlt],
  };
}

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const [markedDates, setMarkedDates] = useState({});
  const [records, setRecords] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData(isRefresh = false) {
    if (!isRefresh) setLoading(true);
    try {
      const uid = await getUid();
      const data = await fetchAllAttendance(uid);
      setRecords(data);
      const marks = {};
      data.forEach((r) => {
        let color = COLORS.neutral;
        if (r.status === "Present") color = COLORS.present;
        else if (r.status === "Absent") color = COLORS.absent;
        else if (r.status === "Holiday") color = COLORS.holiday;
        marks[r.date] = { marked: true, dotColor: color };
      });
      setMarkedDates(marks);
    } catch (e) {
      console.log("Calendar load error:", e.message);
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(true);
  }, []);

  const selectedRecord = selectedDate
    ? records.find((r) => r.date === selectedDate) || null
    : null;

  const displayMarks = selectedDate
    ? {
        ...markedDates,
        [selectedDate]: {
          ...markedDates[selectedDate],
          selected: true,
          selectedColor: COLORS.primary,
        },
      }
    : markedDates;

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading calendar...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={["#2d1250", "#1a0a2e", COLORS.bg]}
          style={styles.headerGrad}
        >
          <View style={styles.titleRow}>
            <Ionicons name="calendar" size={24} color={COLORS.textPrimary} />
            <Text style={styles.title}> Calendar</Text>
          </View>
          <Text style={styles.subtitle}>Tap a date to view details</Text>
          <View style={styles.legend}>
            {[
              {
                color: COLORS.present,
                icon: "checkmark-circle",
                label: "Present",
              },
              { color: COLORS.absent, icon: "close-circle", label: "Absent" },
              { color: COLORS.holiday, icon: "sunny", label: "Holiday" },
            ].map((item) => (
              <View key={item.label} style={styles.legendPill}>
                <Ionicons name={item.icon} size={13} color={item.color} />
                <Text style={styles.legendLabel}> {item.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Calendar */}
        <View style={styles.calendarWrap}>
          <Calendar
            markedDates={displayMarks}
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

        {/* Selected date detail */}
        {selectedDate &&
          (() => {
            const cfg = getStatusConfig(selectedRecord?.status);
            return (
              <View style={styles.detailWrap}>
                <LinearGradient
                  colors={cfg.grad}
                  style={[styles.detailCard, { borderColor: cfg.color }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name={cfg.icon} size={36} color={cfg.color} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailDate}>
                      {new Date(selectedDate + "T00:00:00").toLocaleDateString(
                        "en-IN",
                        {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        },
                      )}
                    </Text>
                    <Text style={[styles.detailStatus, { color: cfg.color }]}>
                      {selectedRecord?.status || "No Record"}
                    </Text>
                    {selectedRecord?.reason &&
                      selectedRecord.reason !== "-" && (
                        <View style={styles.reasonRow}>
                          <Ionicons
                            name="document-text-outline"
                            size={12}
                            color="rgba(255,255,255,0.4)"
                          />
                          <Text style={styles.detailReason}>
                            {" "}
                            {selectedRecord.reason}
                          </Text>
                        </View>
                      )}
                  </View>
                </LinearGradient>
              </View>
            );
          })()}

        {/* Monthly chips */}
        <View style={styles.monthSection}>
          <Text style={styles.monthTitle}>This Month</Text>
          <MonthSummary records={records} />
        </View>
      </ScrollView>
    </View>
  );
}

function MonthSummary({ records }) {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthRecords = records.filter((r) => r.date.startsWith(ym));
  const present = monthRecords.filter((r) => r.status === "Present").length;
  const absent = monthRecords.filter((r) => r.status === "Absent").length;
  const holiday = monthRecords.filter((r) => r.status === "Holiday").length;

  return (
    <View style={styles.chipRow}>
      {[
        {
          label: "Present",
          count: present,
          color: COLORS.present,
          icon: "checkmark-circle",
          grad: ["#052e16", "#14532d"],
        },
        {
          label: "Absent",
          count: absent,
          color: COLORS.absent,
          icon: "close-circle",
          grad: ["#200000", "#450a0a"],
        },
        {
          label: "Holiday",
          count: holiday,
          color: COLORS.holiday,
          icon: "sunny",
          grad: ["#271900", "#451a03"],
        },
      ].map((item) => (
        <LinearGradient
          key={item.label}
          colors={item.grad}
          style={[styles.chip, { borderColor: item.color }]}
        >
          <Ionicons name={item.icon} size={22} color={item.color} />
          <Text style={[styles.chipCount, { color: item.color }]}>
            {item.count}
          </Text>
          <Text style={styles.chipLabel}>{item.label}</Text>
        </LinearGradient>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },
  loadingText: { color: COLORS.textSecondary, marginTop: 12 },
  headerGrad: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  titleRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  title: { fontSize: 26, fontWeight: "900", color: COLORS.textPrimary },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginBottom: 14 },
  legend: { flexDirection: "row", gap: 10 },
  legendPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  legendLabel: { fontSize: 12, color: COLORS.textSecondary },
  calendarWrap: {
    marginHorizontal: 14,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailWrap: { marginHorizontal: 16, marginBottom: 16 },
  detailCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
  },
  detailDate: { fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 4 },
  detailStatus: { fontSize: 20, fontWeight: "800" },
  reasonRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  detailReason: { fontSize: 12, color: "rgba(255,255,255,0.4)" },
  monthSection: { marginHorizontal: 16, marginBottom: 32 },
  monthTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textMuted,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  chipRow: { flexDirection: "row", gap: 10 },
  chip: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  chipCount: { fontSize: 24, fontWeight: "900", marginTop: 4 },
  chipLabel: { fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 },
});
