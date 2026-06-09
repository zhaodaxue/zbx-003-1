import type { AppState, Assignment, CellShift, Conflict } from "@/types";
import { SHIFT_LABEL } from "@/types";
import { detectConflicts, detectOutOfBounds } from "./conflictUtils";
import {
  formatDateCompact,
  getDateDisplay,
  getWeekDates,
  getWeekRangeStr,
  isWeekend,
  parseDate,
} from "./dateUtils";

function buildScheduleTableHtml(
  state: AppState,
  conflicts: Conflict[],
  outOfBounds: { cellKey: string; reason: string; assignmentId: string }[],
): string {
  const weekDates = getWeekDates(state.currentWeekStart);
  const conflictMap = new Map<string, number>();
  conflicts.forEach((c) => {
    c.affectedCellKeys.forEach((key) => {
      conflictMap.set(key, (conflictMap.get(key) ?? 0) + 1);
    });
  });

  const oobMap = new Map<string, { count: number; assignmentIds: Set<string> }>();
  outOfBounds.forEach((o) => {
    if (!oobMap.has(o.cellKey)) {
      oobMap.set(o.cellKey, { count: 0, assignmentIds: new Set() });
    }
    const entry = oobMap.get(o.cellKey)!;
    entry.count += 1;
    entry.assignmentIds.add(o.assignmentId);
  });

  let dateHeaderHtml = "";
  weekDates.forEach((date) => {
    const display = getDateDisplay(date);
    const weekendClass = isWeekend(date) ? ' style="background-color:#f5f5f5;"' : "";
    dateHeaderHtml += `<th colspan="2" class="date-header"${weekendClass}><div class="weekday">${display.weekday}</div><div class="md-date">${display.month}月${display.day}日</div></th>`;
  });

  let shiftHeaderHtml = "";
  weekDates.forEach((date) => {
    const weekendClass = isWeekend(date) ? ' style="background-color:#f5f5f5;"' : "";
    shiftHeaderHtml += `<th class="shift-header"${weekendClass}>上午</th><th class="shift-header"${weekendClass}>下午</th>`;
  });

  let bodyHtml = "";
  for (const volunteer of state.volunteers) {
    bodyHtml += `<tr class="volunteer-row"><td class="volunteer-cell"><div class="volunteer-name">${escapeHtml(volunteer.name)}</div><div class="volunteer-meta">上限${volunteer.maxElderly}人</div></td>`;

    for (const date of weekDates) {
      const targetDay = parseDate(date).getDay();
      const isAvailableDate = volunteer.availableDates.some(
        (d) => parseDate(d).getDay() === targetDay,
      );

      for (const shift of ["morning", "afternoon"] as CellShift[]) {
        const shiftAvailable =
          volunteer.availableShifts.includes("all") ||
          volunteer.availableShifts.includes(shift);
        const isUnavailable = !isAvailableDate || !shiftAvailable;

        const cellKey = `${volunteer.id}_${date}_${shift}`;
        const cellAssignments = state.assignments.filter(
          (a) => a.volunteerId === volunteer.id && a.date === date && a.shift === shift,
        );
        const hasConflict = conflictMap.has(cellKey);
        const oobEntry = oobMap.get(cellKey);
        const hasOob = !!oobEntry && !hasConflict;

        let cellClass = "schedule-cell";
        let cellStyle = "";
        if (isUnavailable) {
          cellClass += " unavailable";
          cellStyle = ' style="background-color:#eeeeee;opacity:0.6;"';
        }
        if (hasConflict) {
          cellClass += " conflict";
          cellStyle = ' style="border:2px solid #d32f2f;background-color:#ffebee;"';
        } else if (hasOob) {
          cellClass += " outofbounds";
          cellStyle =
            ' style="border:2px solid #d97706;background-color:#fffbeb;background-image:repeating-linear-gradient(45deg,rgba(217,119,6,0.08),rgba(217,119,6,0.08) 6px,transparent 6px,transparent 12px);"';
        } else if (isWeekend(date) && !isUnavailable) {
          cellStyle = ' style="background-color:#fafafa;"';
        }

        let tagHtml = "";
        for (const a of cellAssignments) {
          const elderly = state.elderlyList.find((e) => e.id === a.elderlyId);
          if (elderly) {
            const isOobTag = oobEntry?.assignmentIds.has(a.id);
            const tagStyle = isOobTag
              ? ' style="background-color:#fef3c7;color:#78350f;border:1px solid #d97706;"'
              : "";
            tagHtml += `<span class="elderly-tag" title="${escapeHtml(elderly.name)}"${tagStyle}>${isOobTag ? "⚠️ " : ""}${escapeHtml(elderly.shortName)}</span>`;
          }
        }

        const conflictBadge = hasConflict
          ? '<span class="conflict-badge" title="存在冲突">⚠️</span>'
          : "";
        const oobBadge = hasOob
          ? '<span class="oob-badge" title="越界待处理">🟠</span>'
          : "";

        bodyHtml += `<td class="${cellClass}"${cellStyle}><div class="cell-content">${tagHtml}${conflictBadge}${oobBadge}</div></td>`;
      }
    }

    bodyHtml += "</tr>";
  }

  if (state.volunteers.length === 0) {
    const totalCols = 1 + weekDates.length * 2;
    bodyHtml = `<tr><td colspan="${totalCols}" class="empty-hint">暂无志愿者，请先在左侧录入志愿者信息</td></tr>`;
  }

  return `<table class="schedule-table">
    <thead>
      <tr><th class="volunteer-col" rowspan="2">志愿者 \ 日期</th>${dateHeaderHtml}</tr>
      <tr>${shiftHeaderHtml}</tr>
    </thead>
    <tbody>${bodyHtml}</tbody>
  </table>`;
}

function buildConflictSummaryHtml(conflicts: Conflict[]): string {
  if (conflicts.length === 0) {
    return `<div class="no-conflict">
      <div class="check-icon">✅</div>
      <div class="no-conflict-text">本周无硬冲突</div>
    </div>`;
  }

  let listHtml = "";
  conflicts.forEach((c, i) => {
    const typeLabel = {
      VOLUNTEER_DOUBLE_SHIFT: "志愿者同时段重复",
      ELDERLY_DOUBLE_BOOKED: "老人同日重复登记",
      VOLUNTEER_OVER_CAPACITY: "志愿者陪诊人数超上限",
    }[c.type];
    listHtml += `<li class="conflict-item">
      <span class="conflict-index">${i + 1}.</span>
      <span class="conflict-type">[${typeLabel}]</span>
      <span class="conflict-desc">${escapeHtml(c.description)}</span>
    </li>`;
  });

  return `<div class="conflict-section">
    <h3 class="conflict-title">⚠️ 硬冲突摘要（共${conflicts.length}项）</h3>
    <ol class="conflict-list">${listHtml}</ol>
  </div>`;
}

function buildOutOfBoundsSummaryHtml(
  items: { cellKey: string; reason: string; assignmentId: string; description: string }[],
  state: AppState,
): string {
  if (items.length === 0) {
    return `<div class="no-oob">
      <div class="check-icon">🟢</div>
      <div class="no-oob-text">无越界待处理项</div>
    </div>`;
  }

  const reasonLabels: Record<string, string> = {
    DATE_UNAVAILABLE: "超出可服务日期",
    SHIFT_UNAVAILABLE: "超出可服务时段",
    OVER_CAPACITY: "超出陪诊上限",
  };
  const volunteerMap = new Map(state.volunteers.map((v) => [v.id, v.name]));
  const elderlyMap = new Map(state.elderlyList.map((e) => [e.id, e.name]));
  const formatDS = (d: string) => {
    const dt = parseDate(d);
    return `${dt.getMonth() + 1}/${dt.getDate()}`;
  };

  let listHtml = "";
  items.forEach((item, i) => {
    const assignment = state.assignments.find((a) => a.id === item.assignmentId);
    const vName = volunteerMap.get(assignment?.volunteerId ?? "") ?? "未知";
    const eName = elderlyMap.get(assignment?.elderlyId ?? "") ?? "未知老人";
    const dateStr = assignment
      ? `${formatDS(assignment.date)} ${assignment.shift === "morning" ? "上午" : "下午"}`
      : "";
    const typeLabel = reasonLabels[item.reason] ?? item.reason;
    listHtml += `<li class="oob-item">
      <span class="oob-index">${i + 1}.</span>
      <span class="oob-type">[${typeLabel}]</span>
      <span class="oob-desc">
        <strong>${escapeHtml(vName)}</strong> · ${dateStr} · 老人：<strong>${escapeHtml(eName)}</strong> — ${escapeHtml(item.description)}
      </span>
    </li>`;
  });

  return `<div class="oob-section">
    <h3 class="oob-title">🟠 越界待处理（共${items.length}项）</h3>
    <p class="oob-subtitle">因编辑志愿者规则导致部分既有分配不符合新规则，请协调员手动移走或删除后消失</p>
    <ol class="oob-list">${listHtml}</ol>
  </div>`;
}

export function generatePrintableHtml(state: AppState): { filename: string; html: string } {
  const weekDates = getWeekDates(state.currentWeekStart);
  const startCompact = formatDateCompact(weekDates[0]);
  const endCompact = formatDateCompact(weekDates[6]);
  const filename = `陪诊排班表_${startCompact}-${endCompact}.html`;
  const weekRange = getWeekRangeStr(state.currentWeekStart);

  const weekAssignments = state.assignments.filter((a) => weekDates.includes(a.date));
  const weekState: AppState = {
    ...state,
    assignments: weekAssignments,
  };
  const weekConflicts = detectConflicts(weekState.assignments, weekState.volunteers);
  const weekOutOfBoundsRaw = detectOutOfBounds(weekState.assignments, weekState.volunteers);
  const weekOutOfBounds = weekOutOfBoundsRaw.map((o) => ({
    cellKey: o.cellKey,
    reason: o.reason,
    assignmentId: o.assignmentId,
    description: o.description,
  }));

  const tableHtml = buildScheduleTableHtml(weekState, weekConflicts, weekOutOfBounds);
  const conflictSummaryHtml = buildConflictSummaryHtml(weekConflicts);
  const oobSummaryHtml = buildOutOfBoundsSummaryHtml(weekOutOfBounds, weekState);

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>街道养老站陪诊排班表 - ${weekRange}</title>
<style>
  @page { size: landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
    margin: 0;
    padding: 24px;
    color: #212121;
    font-size: 16px;
    line-height: 1.5;
    background: #fff;
  }
  .print-header {
    text-align: center;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 2px solid #1e88e5;
  }
  .print-title {
    font-size: 28px;
    font-weight: 700;
    color: #1565c0;
    margin: 0 0 8px 0;
  }
  .print-subtitle {
    font-size: 18px;
    color: #666;
    margin: 0;
  }
  .schedule-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 24px;
    table-layout: fixed;
  }
  .schedule-table th, .schedule-table td {
    border: 1px solid #e0e0e0;
    padding: 10px;
    vertical-align: top;
    text-align: center;
    word-wrap: break-word;
  }
  .schedule-table thead th {
    background-color: #e3f2fd;
    font-weight: 700;
    color: #1565c0;
  }
  .volunteer-col { width: 120px; }
  .date-header .weekday { font-size: 16px; font-weight: 700; }
  .date-header .md-date { font-size: 14px; color: #666; margin-top: 2px; }
  .shift-header { font-size: 14px; padding: 6px 8px; color: #555; }
  .volunteer-row { page-break-inside: avoid; }
  .volunteer-cell {
    text-align: left;
    background-color: #fafafa;
  }
  .volunteer-name { font-weight: 700; font-size: 16px; margin-bottom: 4px; }
  .volunteer-meta { font-size: 13px; color: #888; }
  .schedule-cell { min-height: 60px; position: relative; }
  .schedule-cell.unavailable { background-color: #eeeeee; }
  .schedule-cell.outofbounds { background-color: #fffbeb; }
  .cell-content { min-height: 44px; }
  .elderly-tag {
    display: inline-block;
    background-color: #e3f2fd;
    color: #1565c0;
    padding: 3px 10px;
    border-radius: 9999px;
    font-size: 13px;
    margin: 2px;
    border: 1px solid rgba(30,136,229,0.3);
  }
  .conflict-badge {
    position: absolute;
    top: 2px;
    right: 2px;
    font-size: 11px;
  }
  .oob-badge {
    position: absolute;
    top: 2px;
    right: 20px;
    font-size: 11px;
  }
  .empty-hint {
    padding: 40px;
    color: #999;
    font-size: 18px;
  }
  .conflict-section {
    margin-top: 28px;
    padding: 16px 20px;
    background-color: #fff8f8;
    border: 1px solid #ffcdd2;
    border-radius: 8px;
    page-break-inside: avoid;
  }
  .conflict-title {
    margin: 0 0 12px 0;
    font-size: 18px;
    color: #d32f2f;
  }
  .conflict-list {
    margin: 0;
    padding-left: 0;
    list-style: none;
  }
  .conflict-item {
    padding: 6px 0;
    border-bottom: 1px dashed #ffcdd2;
    font-size: 14px;
    line-height: 1.6;
  }
  .conflict-item:last-child { border-bottom: none; }
  .conflict-index { color: #666; margin-right: 4px; }
  .conflict-type { color: #d32f2f; font-weight: 700; margin-right: 6px; }
  .conflict-desc { color: #333; }
  .no-conflict {
    margin-top: 28px;
    padding: 20px;
    background-color: #f1f8e9;
    border: 1px solid #a5d6a7;
    border-radius: 8px;
    text-align: center;
    page-break-inside: avoid;
  }
  .check-icon { font-size: 32px; margin-bottom: 8px; }
  .no-conflict-text {
    font-size: 20px;
    font-weight: 700;
    color: #2e7d32;
  }
  .oob-section {
    margin-top: 20px;
    padding: 16px 20px;
    background-color: #fffbeb;
    border: 1px solid #fcd34d;
    border-radius: 8px;
    page-break-inside: avoid;
  }
  .oob-title {
    margin: 0 0 6px 0;
    font-size: 18px;
    color: #92400e;
  }
  .oob-subtitle {
    margin: 0 0 12px 0;
    font-size: 13px;
    color: #78350f;
  }
  .oob-list {
    margin: 0;
    padding-left: 0;
    list-style: none;
  }
  .oob-item {
    padding: 6px 0;
    border-bottom: 1px dashed #fcd34d;
    font-size: 14px;
    line-height: 1.6;
  }
  .oob-item:last-child { border-bottom: none; }
  .oob-index { color: #92400e; margin-right: 4px; }
  .oob-type { color: #b45309; font-weight: 700; margin-right: 6px; }
  .oob-desc { color: #451a03; }
  .no-oob {
    margin-top: 20px;
    padding: 16px;
    background-color: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 8px;
    text-align: center;
    page-break-inside: avoid;
  }
  .no-oob-text {
    font-size: 16px;
    font-weight: 700;
    color: #166534;
  }
  .print-footer {
    margin-top: 32px;
    padding-top: 16px;
    border-top: 1px solid #e0e0e0;
    font-size: 13px;
    color: #999;
    text-align: right;
  }
  @media print {
    body { padding: 0; }
    .print-header { margin-bottom: 12px; }
    .conflict-section, .no-conflict, .oob-section, .no-oob { margin-top: 20px; }
  }
</style>
</head>
<body>
  <div class="print-header">
    <h1 class="print-title">🏥 街道养老站陪诊排班表</h1>
    <p class="print-subtitle">📅 ${weekRange}</p>
  </div>
  ${tableHtml}
  ${conflictSummaryHtml}
  ${oobSummaryHtml}
  <div class="print-footer">
    导出时间：${new Date().toLocaleString("zh-CN")}
  </div>
</body>
</html>`;

  return { filename, html };
}

export function downloadHtmlFile(filename: string, html: string): void {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeHtml(str: string): string {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

export { SHIFT_LABEL };
