import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../constants/colors";
import { fetchAllAttendance, refreshAttendance } from "../../lib/api";
import { exportAttendanceCSV } from "../../lib/export";
import { getUid, getUser } from "../../lib/storage";

const STATUS_CONFIG = {
  Present: {
    color: COLORS.present,
    icon: "checkmark-circle",
    grad: ["#052e16", "#14532d"],
  },
  Absent: {
    color: COLORS.absent,
    icon: "close-circle",
    grad: ["#200000", "#450a0a"],
  },
  Holiday: {
    color: COLORS.holiday,
    icon: "sunny",
    grad: ["#271900", "#451a03"],
  },
};

const FILTERS = ["All", "Present", "Absent", "Holiday"];

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("All");
  const [exporting, setExporting] = useState(false);
  const [user, setUser] = useState(null);

  async function loadData(isRefresh = false) {
    if (!isRefresh) setLoading(true);
    try {
      const uid = await getUid();
      const storedUser = await getUser();
      setUser(storedUser);
      const data = isRefresh
        ? await refreshAttendance(uid)
        : await fetchAllAttendance(uid);
      setRecords([...data].sort((a, b) => b.date.localeCompare(a.date)));
    } catch (_e) {
      Alert.alert("Error", "Could not load attendance history.");
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

  async function handleExport() {
    if (records.length === 0)
      return Alert.alert("No Data", "No records to export.");
    setExporting(true);
    try {
      await exportAttendanceCSV(records, user?.name || "User");
    } catch (e) {
      Alert.alert("Export Failed", e.message);
    } finally {
      setExporting(false);
    }
  }

  const filtered =
    filter === "All" ? records : records.filter((r) => r.status === filter);

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading history...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <LinearGradient
        colors={["#2d1250", "#1a0a2e", COLORS.bg]}
        style={styles.headerGrad}
      >
        <View style={styles.headerRow}>
          <View>
            <View style={styles.titleRow}>
              <Ionicons name="list" size={22} color={COLORS.textPrimary} />
              <Text style={styles.title}> History</Text>
            </View>
            <Text style={styles.subtitle}>{records.length} total records</Text>
          </View>
          <TouchableOpacity
            style={styles.exportBtn}
            onPress={handleExport}
            disabled={exporting}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.primaryDark, COLORS.primary]}
              style={styles.exportGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {exporting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="share-outline" size={15} color="#fff" />
                  <Text style={styles.exportText}> Export</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((f) => {
            const active = filter === f;
            const cfg = STATUS_CONFIG[f];
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                activeOpacity={0.8}
                style={[
                  styles.filterChip,
                  active && {
                    backgroundColor: cfg?.color || COLORS.primary,
                    borderColor: cfg?.color || COLORS.primary,
                  },
                ]}
              >
                {cfg && (
                  <Ionicons
                    name={cfg.icon}
                    size={13}
                    color={active ? "#fff" : cfg.color}
                  />
                )}
                <Text
                  style={[
                    styles.filterText,
                    active && { color: "#fff", fontWeight: "700" },
                  ]}
                >
                  {" "}
                  {f}
                  {f !== "All" &&
                    ` (${records.filter((r) => r.status === f).length})`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </LinearGradient>

      {/* Records List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="calendar-outline"
              size={48}
              color={COLORS.textMuted}
            />
            <Text style={styles.emptyText}>
              No {filter !== "All" ? filter.toLowerCase() : ""} records found
            </Text>
          </View>
        ) : (
          filtered.map((record, idx) => (
            <RecordRow key={record.date + idx} record={record} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function RecordRow({ record }) {
  const cfg = STATUS_CONFIG[record.status] || {
    color: COLORS.neutral,
    icon: "help-circle-outline",
    grad: [COLORS.card, COLORS.cardAlt],
  };
  const date = new Date(record.date + "T00:00:00");
  const dayLabel = date.toLocaleDateString("en-IN", { weekday: "short" });
  const dateLabel = date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <LinearGradient
      colors={cfg.grad}
      style={[styles.row, { borderLeftColor: cfg.color }]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      {/* Day badge */}
      <View style={[styles.dayBadge, { borderColor: cfg.color }]}>
        <Text style={[styles.dayBadgeDay, { color: cfg.color }]}>
          {dayLabel}
        </Text>
        <Text style={styles.dayBadgeNum}>{date.getDate()}</Text>
      </View>

      {/* Info */}
      <View style={{ flex: 1 }}>
        <Text style={styles.rowDate}>{dateLabel}</Text>
        {record.reason && record.reason !== "-" && (
          <View style={styles.rowReasonRow}>
            <Ionicons
              name="document-text-outline"
              size={11}
              color="rgba(255,255,255,0.35)"
            />
            <Text style={styles.rowReason}> {record.reason}</Text>
          </View>
        )}
      </View>

      {/* Status */}
      <View style={styles.statusBadge}>
        <Ionicons name={cfg.icon} size={18} color={cfg.color} />
        <Text style={[styles.statusText, { color: cfg.color }]}>
          {record.status}
        </Text>
      </View>
    </LinearGradient>
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

  // Header — more breathing room at top
  headerGrad: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 8 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 24, fontWeight: "900", color: COLORS.textPrimary },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 3,
    letterSpacing: 0.3,
  },

  // Export button — slight glow shadow
  exportBtn: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  exportGrad: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 5,
  },
  exportText: { fontSize: 13, fontWeight: "700", color: "#fff" },

  // Filter chips — more refined inactive + active states
  filterScroll: { marginBottom: 12 },
  filterRow: { flexDirection: "row", gap: 8, paddingRight: 10 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "rgba(255,255,255,0.05)",
    gap: 4,
  },
  filterText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    letterSpacing: 0.2,
  },

  // List — bottom padding clears floating tab bar
  list: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 100, gap: 10 },

  // Record row — glassmorphism border + status-tinted shadow
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    padding: 14,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },

  // Day badge — more pronounced border + softer background
  dayBadge: {
    width: 44,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  dayBadgeDay: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dayBadgeNum: { fontSize: 20, fontWeight: "900", color: "#fff" },

  // Row text
  rowDate: { fontSize: 13, fontWeight: "600", color: COLORS.textPrimary },
  rowReasonRow: { flexDirection: "row", alignItems: "center", marginTop: 3 },
  rowReason: { fontSize: 11, color: "rgba(255,255,255,0.35)", flexShrink: 1 },

  // Status badge
  statusBadge: { alignItems: "center", gap: 4 },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Empty state
  emptyState: { alignItems: "center", paddingTop: 80, gap: 14 },
  emptyText: { color: COLORS.textMuted, fontSize: 14, letterSpacing: 0.3 },
});
