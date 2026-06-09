import type { AppState, Assignment, CellShift, Conflict } from "@/types";
import { SHIFT_LABEL } from "@/types";
import { detectConflicts } from "./conflictUtils";
import {
  formatDateCompact,
  getDateDisplay,
  getWeekDates,
  getWeekRangeStr,
  isWeekend,
} from "./dateUtils";

function buildScheduleTableHtml(state: AppState, conflicts: Conflict[]): string {
  const weekDates = getWeekDates(state.currentWeekStart);
  const conflictMap = new Map<string, number>();
  conflicts.forEach((c) => {
    c.affectedCellKeys.forEach((key) => {
      conflictMap.set(key, (conflictMap.get(key) ?? 0) + 1);
    });
  });

  let dateHeaderHtml = "";
  weekDates.forEach((date) => {
    const display = getDateDisplay(date);
    const weekendClass = isWeekend(date) ? ' style="background-color:#f5f5f5;"' : "";
    dateHeaderHtml += `<th colspan="2" class="date-header"${weekendClass}><div class="weekday">${display.weekday}</div><div class="md-date">${display.month}月${display.day}日</div></th>`;
  });

  let shiftHeaderHtml = '<th class="volunteer-col">志愿者</th>';
  weekDates.forEach((date) => {
    const weekendClass = isWeekend(date) ? ' style="background-color:#f5f5f5;"' : "";
    shiftHeaderHtml += `<th class="shift-header"${weekendClass}>上午</th><th class="shift-header"${weekendClass}>下午</th>`;
  });

  let bodyHtml = "";
  for (const volunteer of state.volunteers) {
    bodyHtml += `<tr class="volunteer-row"><td class="volunteer-cell"><div class="volunteer-name">${escapeHtml(volunteer.name)}</div><div class="volunteer-meta">上限${volunteer.maxElderly}人</div></td>`;

    for (const date of weekDates) {
      const isAvailableDate = volunteer.availableDates.includes(date);

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

        let cellClass = "schedule-cell";
        let cellStyle = "";
        if (isUnavailable) {
          cellClass += " unavailable";
          cellStyle = ' style="background-color:#eeeeee;opacity:0.6;"';
        }
        if (hasConflict) {
          cellClass += " conflict";
          cellStyle = ' style="border:2px solid #d32f2f;background-color:#ffebee;"';
        } else if (isWeekend(date) && !isUnavailable) {
          cellStyle = ' style="background-color:#fafafa;"';
        }

        let tagHtml = "";
        for (const a of cellAssignments) {
          const elderly = state.elderlyList.find((e) => e.id === a.elderlyId);
          if (elderly) {
            tagHtml += `<span class="elderly-tag" title="${escapeHtml(elderly.name)}">${escapeHtml(elderly.shortName)}</span>`;
          }
        }

        const conflictBadge = hasConflict
          ? '<span class="conflict-badge" title="存在冲突">⚠️</span>'
          : "";

        bodyHtml += `<td class="${cellClass}"${cellStyle}><div class="cell-content">${tagHtml}${conflictBadge}</div></td>`;
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
    <h3 class="conflict-title">⚠️ 冲突摘要（共${conflicts.length}项）</h3>
    <ol class="conflict-list">${listHtml}</ol>
  </div>`;
}

export function generatePrintableHtml(state: AppState): { filename: string; html: string } {
  const weekDates = getWeekDates(state.currentWeekStart);
  const startCompact = formatDateCompact(weekDates[0]);
  const endCompact = formatDateCompact(weekDates[6]);
  const filename = `陪诊排班表_${startCompact}-${endCompact}.html`;
  const weekRange = getWeekRangeStr(state.currentWeekStart);

  const conflicts = detectConflicts(state.assignments, state.volunteers);
  const weekConflictCount = conflicts.filter((c) => {
    const assignment = state.assignments.find((a) => c.relatedAssignmentIds.includes(a.id));
    return assignment ? weekDates.includes(assignment.date) : true;
  });
  const weekAssignments = state.assignments.filter((a) => weekDates.includes(a.date));
  const weekState: AppState = {
    ...state,
    assignments: weekAssignments,
  };
  const weekConflicts = detectConflicts(weekState.assignments, weekState.volunteers);

  const tableHtml = buildScheduleTableHtml(weekState, weekConflicts);
  const summaryHtml = buildConflictSummaryHtml(weekConflicts);

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
    font-size: 14px;
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
    font-size: 24px;
    font-weight: 700;
    color: #1565c0;
    margin: 0 0 8px 0;
  }
  .print-subtitle {
    font-size: 16px;
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
    padding: 8px;
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
  .date-header .weekday { font-size: 14px; font-weight: 700; }
  .date-header .md-date { font-size: 12px; color: #666; margin-top: 2px; }
  .shift-header { font-size: 12px; padding: 4px 8px; color: #555; }
  .volunteer-row { page-break-inside: avoid; }
  .volunteer-cell {
    text-align: left;
    background-color: #fafafa;
  }
  .volunteer-name { font-weight: 700; font-size: 15px; margin-bottom: 4px; }
  .volunteer-meta { font-size: 12px; color: #888; }
  .schedule-cell { min-height: 60px; position: relative; }
  .schedule-cell.unavailable { background-color: #eeeeee; }
  .cell-content { min-height: 44px; }
  .elderly-tag {
    display: inline-block;
    background-color: #e3f2fd;
    color: #1565c0;
    padding: 2px 8px;
    border-radius: 9999px;
    font-size: 12px;
    margin: 2px;
    border: 1px solid rgba(30,136,229,0.3);
  }
  .conflict-badge {
    position: absolute;
    top: 2px;
    right: 2px;
    font-size: 10px;
  }
  .empty-hint {
    padding: 40px;
    color: #999;
    font-size: 16px;
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
    font-size: 16px;
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
    font-size: 13px;
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
    font-size: 18px;
    font-weight: 700;
    color: #2e7d32;
  }
  .print-footer {
    margin-top: 32px;
    padding-top: 16px;
    border-top: 1px solid #e0e0e0;
    font-size: 12px;
    color: #999;
    text-align: right;
  }
  @media print {
    body { padding: 0; }
    .print-header { margin-bottom: 12px; }
    .conflict-section, .no-conflict { margin-top: 20px; }
  }
</style>
</head>
<body>
  <div class="print-header">
    <h1 class="print-title">🏥 街道养老站陪诊排班表</h1>
    <p class="print-subtitle">📅 ${weekRange}</p>
  </div>
  ${tableHtml}
  ${summaryHtml}
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

// re-export SHIFT_LABEL for consistency
export { SHIFT_LABEL };
