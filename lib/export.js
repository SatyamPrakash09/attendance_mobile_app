import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

export async function exportAttendanceCSV(records, userName = "User") {
  if (!records || records.length === 0) {
    throw new Error("No attendance records to export.");
  }

  const header = "Date,Status,Reason,Name,Section\n";
  const rows = records
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => {
      const reason = (r.reason || "-").replace(/,/g, ";").replace(/\n/g, " ");
      const name = (r.name || userName).replace(/,/g, ";");
      const section = (r.section || "-").replace(/,/g, ";");
      return `${r.date},${r.status},${reason},${name},${section}`;
    })
    .join("\n");

  const csv = header + rows;

  const filename = `attendance_${userName.replace(/\s+/g, "_")}_${Date.now()}.csv`;
  const fileUri = FileSystem.documentDirectory + filename; // documentDirectory is more stable than cacheDirectory

  // Write CSV directly as UTF-8 (no btoa/base64 needed in React Native)
  await FileSystem.writeAsStringAsync(fileUri, csv, {
    encoding: "utf8",
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error("Sharing not available on this device.");

  await Sharing.shareAsync(fileUri, {
    mimeType: "text/csv",
    dialogTitle: "Export Attendance CSV",
    UTI: "public.comma-separated-values-text",
  });

  // Cleanup
  await FileSystem.deleteAsync(fileUri, { idempotent: true });
}
