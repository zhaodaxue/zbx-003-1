import { useMemo, useState } from "react";
import { Download, AlertTriangle, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { useScheduleStore } from "@/store/useScheduleStore";
import { detectConflicts, detectOutOfBounds, getOutOfBoundsReasonLabel } from "@/utils/conflictUtils";
import { getWeekDates, getWeekRangeStr, parseDate } from "@/utils/dateUtils";
import { downloadHtmlFile, generatePrintableHtml } from "@/utils/exportUtils";

export default function BottomBar() {
  const volunteers = useScheduleStore((s) => s.volunteers);
  const assignments = useScheduleStore((s) => s.assignments);
  const elderlyList = useScheduleStore((s) => s.elderlyList);
  const currentWeekStart = useScheduleStore((s) => s.currentWeekStart);
  const dispatch = useScheduleStore((s) => s.dispatch);

  const [showConflicts, setShowConflicts] = useState(false);
  const [showOutOfBounds, setShowOutOfBounds] = useState(false);
  const [exporting, setExporting] = useState(false);

  const weekDates = useMemo(() => getWeekDates(currentWeekStart), [currentWeekStart]);

  const weekAssignments = useMemo(
    () => assignments.filter((a) => weekDates.includes(a.date)),
    [assignments, weekDates],
  );

  const conflicts = useMemo(
    () => detectConflicts(weekAssignments, volunteers),
    [weekAssignments, volunteers],
  );

  const outOfBounds = useMemo(
    () => detectOutOfBounds(weekAssignments, volunteers),
    [weekAssignments, volunteers],
  );

  const weekRange = getWeekRangeStr(currentWeekStart);

  const handleExport = () => {
    setExporting(true);
    try {
      const state = {
        volunteers,
        elderlyList,
        assignments,
        currentWeekStart,
      };
      const { filename, html } = generatePrintableHtml(state);
      downloadHtmlFile(filename, html);
    } finally {
      setTimeout(() => setExporting(false), 500);
    }
  };

  const handleLoadDemo = () => {
    if (!window.confirm("是否加载示例数据？将覆盖当前所有数据。")) return;

    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);

    const d = (offset: number) => {
      const dt = new Date(monday);
      dt.setDate(monday.getDate() + offset);
      return dt.toISOString().slice(0, 10);
    };

    dispatch({
      type: "LOAD_STATE",
      payload: {
        volunteers: [
          {
            id: "v1",
            name: "张阿姨",
            availableDates: [d(0), d(1), d(2), d(3), d(4)],
            availableShifts: ["all"],
            maxElderly: 2,
          },
          {
            id: "v2",
            name: "李叔叔",
            availableDates: [d(0), d(2), d(4)],
            availableShifts: ["morning"],
            maxElderly: 1,
          },
          {
            id: "v3",
            name: "王大姐",
            availableDates: [d(1), d(2), d(3), d(4), d(5)],
            availableShifts: ["afternoon"],
            maxElderly: 2,
          },
          {
            id: "v4",
            name: "陈老师",
            availableDates: [d(0), d(1), d(2), d(3), d(4), d(5), d(6)],
            availableShifts: ["all"],
            maxElderly: 2,
          },
        ],
        elderlyList: [
          { id: "e1", name: "刘大爷", shortName: "刘大" },
          { id: "e2", name: "赵奶奶", shortName: "赵奶" },
          { id: "e3", name: "孙大伯", shortName: "孙大" },
          { id: "e4", name: "周婆婆", shortName: "周婆" },
          { id: "e5", name: "吴爷爷", shortName: "吴爷" },
          { id: "e6", name: "郑阿姨", shortName: "郑阿" },
        ],
        assignments: [
          { id: "a1", volunteerId: "v1", elderlyId: "e1", date: d(0), shift: "morning" },
          { id: "a2", volunteerId: "v1", elderlyId: "e2", date: d(0), shift: "morning" },
          { id: "a3", volunteerId: "v2", elderlyId: "e3", date: d(0), shift: "morning" },
          { id: "a4", volunteerId: "v1", elderlyId: "e1", date: d(1), shift: "morning" },
          { id: "a5", volunteerId: "v4", elderlyId: "e1", date: d(1), shift: "morning" },
          { id: "a6", volunteerId: "v3", elderlyId: "e4", date: d(1), shift: "afternoon" },
          { id: "a7", volunteerId: "v4", elderlyId: "e5", date: d(2), shift: "morning" },
          { id: "a8", volunteerId: "v4", elderlyId: "e6", date: d(2), shift: "morning" },
          { id: "a9", volunteerId: "v4", elderlyId: "e3", date: d(2), shift: "morning" },
          { id: "a10", volunteerId: "v2", elderlyId: "e2", date: d(2), shift: "morning" },
          { id: "a11", volunteerId: "v3", elderlyId: "e5", date: d(3), shift: "afternoon" },
          { id: "a12", volunteerId: "v3", elderlyId: "e6", date: d(3), shift: "afternoon" },
          { id: "a13", volunteerId: "v1", elderlyId: "e3", date: d(4), shift: "morning" },
          { id: "a14", volunteerId: "v1", elderlyId: "e4", date: d(4), shift: "afternoon" },
          { id: "a15", volunteerId: "v4", elderlyId: "e1", date: d(5), shift: "afternoon" },
          { id: "a16", volunteerId: "v3", elderlyId: "e2", date: d(5), shift: "afternoon" },
        ],
        currentWeekStart: d(0),
      },
    });
  };

  const conflictCount = conflicts.length;
  const hasConflict = conflictCount > 0;
  const outOfBoundsCount = outOfBounds.length;
  const hasOutOfBounds = outOfBoundsCount > 0;

  const volunteerMap = useMemo(() => {
    const m = new Map(volunteers.map((v) => [v.id, v.name]));
    return m;
  }, [volunteers]);

  const elderlyMap = useMemo(() => {
    const m = new Map(elderlyList.map((e) => [e.id, e.name]));
    return m;
  }, [elderlyList]);

  const formatDateShort = (date: string) => {
    const d = parseDate(date);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-schedule-border shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
      <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <FileText className="w-4 h-4 text-medical-blue" />
            <span>本周：{weekRange}</span>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-gray-600">
              <span className="w-2 h-2 rounded-full bg-medical-blue" />
              <span>志愿者 {volunteers.length} 人</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-600">
              <span className="w-2 h-2 rounded-full bg-medical-orange" />
              <span>本周排班 {weekAssignments.length} 条</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setShowConflicts(!showConflicts);
                if (!showConflicts) setShowOutOfBounds(false);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                hasConflict
                  ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                  : "bg-green-50 text-green-600 hover:bg-green-100 border border-green-200"
              }`}
            >
              {hasConflict ? (
                <>
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-bold">{conflictCount} 项冲突</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-bold">无冲突</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowOutOfBounds(!showOutOfBounds);
                if (!showOutOfBounds) setShowConflicts(false);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                hasOutOfBounds
                  ? "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-300"
                  : "bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              <AlertCircle className="w-5 h-5" />
              <span className="font-bold">
                {hasOutOfBounds ? `${outOfBoundsCount} 项越界` : "无越界"}
              </span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleLoadDemo}
            className="btn-secondary py-2 px-4 text-sm min-h-0 h-10"
          >
            🎯 加载示例数据
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || volunteers.length === 0}
            className="btn-accent flex items-center gap-2 py-2.5"
          >
            <Download className="w-5 h-5" />
            {exporting ? "导出中..." : "导出本周排班"}
          </button>
        </div>
      </div>

      {showConflicts && hasConflict && (
        <div className="border-t border-red-100 bg-red-50/80 max-h-48 overflow-y-auto scrollbar-thin">
          <div className="max-w-[1600px] mx-auto px-6 py-4">
            <div className="text-sm font-bold text-red-700 mb-3">
              ⚠️ 硬冲突详情（请协调员尽快调整以下排班）：
            </div>
            <ol className="space-y-2">
              {conflicts.map((c, i) => {
                const typeLabel = {
                  VOLUNTEER_DOUBLE_SHIFT: "同时段重复",
                  ELDERLY_DOUBLE_BOOKED: "老人重复登记",
                  VOLUNTEER_OVER_CAPACITY: "超上限",
                }[c.type];
                return (
                  <li
                    key={c.id}
                    className="flex items-start gap-3 text-sm bg-white rounded-lg px-4 py-2 border border-red-100"
                  >
                    <span className="text-red-400 font-bold w-6">{i + 1}.</span>
                    <span className="shrink-0 badge bg-red-100 text-red-600 text-xs mt-0.5">
                      {typeLabel}
                    </span>
                    <span className="text-gray-700 flex-1">{c.description}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      )}

      {showOutOfBounds && hasOutOfBounds && (
        <div className="border-t border-amber-200 bg-amber-50/90 max-h-48 overflow-y-auto scrollbar-thin">
          <div className="max-w-[1600px] mx-auto px-6 py-4">
            <div className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              🟠 越界待处理（编辑志愿者规则后，部分既有分配不符合新规则。手动移走或删除后消失）：
            </div>
            <ol className="space-y-2">
              {outOfBounds.map((item, i) => {
                const assignment = weekAssignments.find((a) => a.id === item.assignmentId);
                const vName = volunteerMap.get(item.volunteerId) ?? "未知";
                const eName = assignment
                  ? elderlyMap.get(assignment.elderlyId) ?? "未知老人"
                  : "未知老人";
                const dateStr = assignment
                  ? `${formatDateShort(assignment.date)} ${assignment.shift === "morning" ? "上午" : "下午"}`
                  : "";
                return (
                  <li
                    key={item.id}
                    className="flex items-start gap-3 text-sm bg-white rounded-lg px-4 py-2 border border-amber-200"
                  >
                    <span className="text-amber-500 font-bold w-6">{i + 1}.</span>
                    <span className="shrink-0 badge bg-amber-100 text-amber-700 text-xs mt-0.5 border border-amber-200">
                      {getOutOfBoundsReasonLabel(item.reason)}
                    </span>
                    <span className="text-gray-700 flex-1">
                      <span className="font-medium text-amber-800">{vName}</span>
                      {dateStr && <span className="text-gray-500"> · {dateStr}</span>}
                      <span className="text-gray-500"> · 老人：</span>
                      <span className="font-medium text-gray-800">{eName}</span>
                      <span className="text-gray-500 ml-2">— {item.description}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
