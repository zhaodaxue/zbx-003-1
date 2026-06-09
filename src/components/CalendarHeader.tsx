import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useScheduleStore } from "@/store/useScheduleStore";
import {
  addWeeks,
  getCurrentWeekMonday,
  getDateDisplay,
  getWeekDates,
  getWeekRangeStr,
  isWeekend,
} from "@/utils/dateUtils";

export default function CalendarHeader() {
  const currentWeekStart = useScheduleStore((s) => s.currentWeekStart);
  const dispatch = useScheduleStore((s) => s.dispatch);

  const weekDates = getWeekDates(currentWeekStart);
  const weekRange = getWeekRangeStr(currentWeekStart);

  const goPrevWeek = () => {
    dispatch({ type: "SET_CURRENT_WEEK", payload: addWeeks(currentWeekStart, -1) });
  };

  const goNextWeek = () => {
    dispatch({ type: "SET_CURRENT_WEEK", payload: addWeeks(currentWeekStart, 1) });
  };

  const goThisWeek = () => {
    dispatch({ type: "SET_CURRENT_WEEK", payload: getCurrentWeekMonday() });
  };

  const isThisWeek = currentWeekStart === getCurrentWeekMonday();

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white rounded-lg border border-schedule-border p-1 shadow-sm">
            <button
              type="button"
              onClick={goPrevWeek}
              className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"
              title="上一周"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 px-3 font-bold text-gray-800 min-w-[260px] justify-center">
              <Calendar className="w-5 h-5 text-medical-blue" />
              <span className="text-base">{weekRange}</span>
            </div>
            <button
              type="button"
              onClick={goNextWeek}
              className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"
              title="下一周"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {!isThisWeek && (
            <button
              type="button"
              onClick={goThisWeek}
              className="btn-secondary py-2 px-4 text-sm min-h-0 h-10"
            >
              回到本周
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-white border border-schedule-border" />
            <span>工作日</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-schedule-weekend border border-schedule-border" />
            <span>周末</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-schedule-conflict-bg border-2 border-schedule-conflict-border" />
            <span>有冲突</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm border-2 bg-amber-50" style={{ borderColor: "#d97706" }} />
            <span>越界待处理</span>
          </div>
        </div>
      </div>

      <div className="bg-medical-blue-dark rounded-t-xl overflow-hidden">
        <div className="grid" style={{ gridTemplateColumns: "140px repeat(14, 1fr)" }}>
          <div
            className="px-4 text-white font-bold text-center text-sm border-r border-white/20 flex flex-col justify-center"
            style={{ gridRow: "span 2" }}
          >
            <div>志愿者</div>
            <div className="text-xs opacity-80 mt-0.5">上限人数</div>
          </div>

          {weekDates.map((date) => {
            const display = getDateDisplay(date);
            const weekend = isWeekend(date);
            return (
              <div
                key={date}
                className={`px-2 py-2 text-center text-white font-medium border-r border-white/20 last:border-r-0 ${
                  weekend ? "bg-medical-blue/30" : ""
                }`}
                style={{ gridColumn: "span 2" }}
              >
                <div className="text-sm">{display.weekday}</div>
                <div className="text-xs opacity-90 mt-0.5">
                  {display.month}月{display.day}日
                </div>
              </div>
            );
          })}

          {weekDates.map((date) => {
            const weekend = isWeekend(date);
            const bg = weekend ? "bg-medical-blue/15" : "";
            return [
              <div
                key={`${date}-am`}
                className={`px-1 py-1.5 text-center text-white/90 text-xs font-medium border-r border-white/10 border-t border-white/20 ${bg}`}
              >
                ☀️ 上午
              </div>,
              <div
                key={`${date}-pm`}
                className={`px-1 py-1.5 text-center text-white/90 text-xs font-medium border-r border-white/10 last:border-r-0 border-t border-white/20 ${bg}`}
              >
                🌙 下午
              </div>,
            ];
          })}
        </div>
      </div>
    </div>
  );
}
