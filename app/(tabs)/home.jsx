import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../constants/colors";
import { fetchAllAttendance, markAttendance, markHoliday } from "../../lib/api";
import { getUid, getUser } from "../../lib/storage";

function getStatusConfig(status) {
  if (status === "Present")
    return {
      color: COLORS.present,
      icon: "checkmark-circle",
      label: "Present",
      grad: ["#052e16", "#14532d"],
    };
  if (status === "Absent")
    return {
      color: COLORS.absent,
      icon: "close-circle",
      label: "Absent",
      grad: ["#200000", "#450a0a"],
    };
  if (status === "Holiday")
    return {
      color: COLORS.holiday,
      icon: "sunny",
      label: "Holiday",
      grad: ["#271900", "#451a03"],
    };
  return {
    color: COLORS.primary,
    icon: "help-circle-outline",
    label: "Not Marked",
    grad: ["#1a0a2e", "#2d1250"],
  };
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState(null);
  const [uid, setUid] = useState(null);
  const [todayRecord, setTodayRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [absentModal, setAbsentModal] = useState(false);
  const [absentReason, setAbsentReason] = useState("");
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const todayIST = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  const todayDisplay = new Date().toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const hour = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
  ).getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const greetIcon =
    hour < 12 ? "sunny-outline" : hour < 17 ? "sunny" : "moon-outline";

  function animateIn() {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }

  async function loadData(isRefresh = false) {
    if (!isRefresh) setLoading(true);
    try {
      const storedUid = await getUid();
      const storedUser = await getUser();
      setUid(storedUid);
      setUser(storedUser);
      const records = await fetchAllAttendance(storedUid);
      setTodayRecord(records.find((r) => r.date === todayIST) || null);
    } catch (e) {
      console.log("Load error:", e.message);
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
      animateIn();
    }
  }

  useEffect(() => {
    loadData();
  });
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(true);
  }, []);

  async function submitMark(status, reason) {
    setAbsentModal(false);
    setActionLoading(status);
    // Haptic feedback per action type
    if (status === "Present")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    else if (status === "Absent")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (status === "Holiday") await markHoliday(uid);
      else await markAttendance(uid, status, reason || "-");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await loadData(true);
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", e.message || "Failed to mark attendance.");
    } finally {
      setActionLoading(null);
    }
  }

  const sc = getStatusConfig(todayRecord?.status);

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Gradient Header */}
        <LinearGradient
          colors={["#2d1250", "#1a0a2e", COLORS.bg]}
          style={styles.headerGrad}
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            <View style={styles.greetRow}>
              <Ionicons
                name={greetIcon}
                size={16}
                color={COLORS.textSecondary}
              />
              <Text style={styles.greeting}> {greeting}</Text>
            </View>
            <Text style={styles.userName}>{user?.name || "User"}</Text>
            {user?.section ? (
              <View style={styles.sectionBadge}>
                <Ionicons
                  name="book-outline"
                  size={12}
                  color={COLORS.primaryLight}
                />
                <Text style={styles.sectionBadgeText}> {user.section}</Text>
              </View>
            ) : null}
          </Animated.View>
        </LinearGradient>

        <Text style={styles.dateLabel}>{todayDisplay}</Text>

        {/* Status Card */}
        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          <LinearGradient
            colors={sc.grad}
            style={[styles.statusCard, { borderColor: sc.color }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name={sc.icon} size={44} color={sc.color} />
            <View style={{ flex: 1 }}>
              <Text style={styles.statusLabel}>{"Today's Status"}</Text>
              <Text style={[styles.statusValue, { color: sc.color }]}>
                {sc.label}
              </Text>
              {todayRecord?.reason && todayRecord.reason !== "-" && (
                <View style={styles.reasonRow}>
                  <Ionicons
                    name="document-text-outline"
                    size={12}
                    color="rgba(255,255,255,0.4)"
                  />
                  <Text style={styles.statusReason}> {todayRecord.reason}</Text>
                </View>
              )}
            </View>
            <View style={[styles.glowDot, { backgroundColor: sc.color }]} />
          </LinearGradient>
        </Animated.View>

        {/* Section Title */}
        <Text style={styles.sectionTitle}>Mark Today</Text>

        {/* Present / Absent row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtnWrap}
            onPress={() => submitMark("Present", "Present")}
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
                  <Ionicons name="checkmark-circle" size={30} color="#4ade80" />
                  <Text style={styles.actionLabel}>Present</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtnWrap}
            onPress={() => setAbsentModal(true)}
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
                  <Ionicons name="close-circle" size={30} color="#f87171" />
                  <Text style={styles.actionLabel}>Absent</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Holiday */}
        <TouchableOpacity
          style={styles.holidayWrap}
          onPress={() => {
            Alert.alert(
              "Mark as Holiday",
              "Mark today as a holiday? This removes any existing attendance.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Yes, Holiday",
                  onPress: () => submitMark("Holiday", "Holiday"),
                },
              ],
            );
          }}
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
                <Ionicons name="sunny" size={24} color="#fbbf24" />
                <Text style={styles.actionLabel}>Declare Holiday</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.pullHint}>Pull down to refresh</Text>
      </ScrollView>

      {/* Absent Modal */}
      <Modal
        visible={absentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setAbsentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <LinearGradient
              colors={["#1a0a2e", COLORS.card]}
              style={styles.modalGrad}
            >
              <Text style={styles.modalTitle}>Why Absent?</Text>
              <Text style={styles.modalSub}>Add a reason (optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Sick, Family function…"
                placeholderTextColor={COLORS.textMuted}
                value={absentReason}
                onChangeText={setAbsentReason}
                multiline
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => {
                    setAbsentModal(false);
                    setAbsentReason("");
                  }}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSubmitBtn}
                  onPress={() => {
                    const reason = absentReason.trim() || "-";
                    setAbsentReason("");
                    submitMark("Absent", reason);
                  }}
                >
                  <LinearGradient
                    colors={["#7f1d1d", "#991b1b"]}
                    style={styles.modalSubmitGrad}
                  >
                    <Text style={styles.modalSubmitText}>Mark Absent</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>
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
  scroll: { paddingBottom: 40 },
  headerGrad: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 28 },
  greetRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  greeting: { fontSize: 14, color: COLORS.textSecondary },
  userName: {
    fontSize: 30,
    fontWeight: "900",
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  sectionBadge: {
    flexDirection: "row",
    alignSelf: "flex-start",
    backgroundColor: COLORS.overlay,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: "center",
  },
  sectionBadgeText: {
    fontSize: 12,
    color: COLORS.primaryLight,
    fontWeight: "600",
  },
  dateLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginHorizontal: 22,
    marginBottom: 16,
    marginTop: -8,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
    borderWidth: 1,
    gap: 14,
    overflow: "hidden",
  },
  statusLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 2,
  },
  statusValue: { fontSize: 24, fontWeight: "800" },
  reasonRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  statusReason: { fontSize: 12, color: "rgba(255,255,255,0.4)" },
  glowDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    opacity: 0.8,
    position: "absolute",
    top: 14,
    right: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textMuted,
    marginHorizontal: 22,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  actionBtnWrap: { flex: 1 },
  actionBtn: { borderRadius: 16, padding: 20, alignItems: "center", gap: 8 },
  holidayWrap: { marginHorizontal: 20 },
  holidayBtn: {
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "rgba(255,255,255,0.9)",
  },
  pullHint: {
    textAlign: "center",
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 28,
  },
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
  modalSub: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 18 },
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
