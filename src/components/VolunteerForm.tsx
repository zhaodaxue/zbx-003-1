import { useState } from "react";
import { UserPlus, Users, Clock, CalendarDays } from "lucide-react";
import type { Shift } from "@/types";
import { SHIFT_FULL_LABEL } from "@/types";
import { useScheduleStore } from "@/store/useScheduleStore";
import { getWeekDates, parseDate } from "@/utils/dateUtils";

export default function VolunteerForm() {
  const dispatch = useScheduleStore((s) => s.dispatch);
  const currentWeekStart = useScheduleStore((s) => s.currentWeekStart);

  const [name, setName] = useState("");
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [selectedShifts, setSelectedShifts] = useState<Set<Shift>>(new Set(["all"]));
  const [maxElderly, setMaxElderly] = useState<1 | 2>(1);

  const weekDates = getWeekDates(currentWeekStart);

  const toggleDate = (date: string) => {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  const toggleShift = (shift: Shift) => {
    setSelectedShifts((prev) => {
      const next = new Set(prev);
      if (shift === "all") {
        if (next.has("all")) {
          next.clear();
        } else {
          next.clear();
          next.add("all");
        }
      } else {
        next.delete("all");
        if (next.has(shift)) {
          next.delete(shift);
        } else {
          next.add(shift);
        }
        if (next.has("morning") && next.has("afternoon")) {
          next.clear();
          next.add("all");
        }
      }
      return next;
    });
  };

  const selectAllWeekdays = () => {
    const dates = weekDates.filter((d) => {
      const day = parseDate(d).getDay();
      return day >= 1 && day <= 5;
    });
    setSelectedDates(new Set(dates));
  };

  const selectAllDates = () => {
    setSelectedDates(new Set(weekDates));
  };

  const clearDates = () => {
    setSelectedDates(new Set());
  };

  const canSubmit =
    name.trim().length > 0 && selectedDates.size > 0 && selectedShifts.size > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    dispatch({
      type: "ADD_VOLUNTEER",
      payload: {
        name: name.trim(),
        availableDates: Array.from(selectedDates).sort(),
        availableShifts: Array.from(selectedShifts),
        maxElderly,
      },
    });

    setName("");
    setSelectedDates(new Set());
    setSelectedShifts(new Set(["all"]));
    setMaxElderly(1);
  };

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-5">
        <UserPlus className="w-6 h-6 text-medical-blue" />
        <h2 className="text-lg font-bold text-gray-800">录入志愿者</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <span className="text-medical-blue">👤</span> 志愿者姓名
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="请输入志愿者姓名"
            className="input-field"
            maxLength={20}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              <CalendarDays className="w-4 h-4 inline mr-1 text-medical-blue" />
              可服务日期（本周）
            </label>
            <div className="flex gap-1 text-xs">
              <button
                type="button"
                onClick={selectAllWeekdays}
                className="px-2 py-1 text-medical-blue hover:bg-medical-blue-light rounded-md transition-colors"
              >
                工作日
              </button>
              <button
                type="button"
                onClick={selectAllDates}
                className="px-2 py-1 text-medical-blue hover:bg-medical-blue-light rounded-md transition-colors"
              >
                全部
              </button>
              <button
                type="button"
                onClick={clearDates}
                className="px-2 py-1 text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
              >
                清空
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {weekDates.map((date) => {
              const d = parseDate(date);
              const dayName = ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              const isSelected = selectedDates.has(date);
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => toggleDate(date)}
                  className={`
                    flex flex-col items-center py-2 px-1 rounded-lg border-2 transition-all duration-150 text-sm
                    ${isSelected
                      ? "border-medical-blue bg-medical-blue-light text-medical-blue-dark font-medium"
                      : isWeekend
                        ? "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300"
                        : "border-gray-200 bg-white text-gray-700 hover:border-medical-blue/50"
                    }
                  `}
                >
                  <span className="text-xs opacity-70">周{dayName}</span>
                  <span className="font-medium">{d.getDate()}</span>
                </button>
              );
            })}
          </div>
          {selectedDates.size === 0 && (
            <p className="text-xs text-gray-500 mt-2">已选 {selectedDates.size} 天</p>
          )}
          {selectedDates.size > 0 && (
            <p className="text-xs text-medical-blue-dark mt-2 font-medium">
              ✓ 已选 {selectedDates.size} 天
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Clock className="w-4 h-4 inline mr-1 text-medical-blue" />
            可服务时段
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(["morning", "afternoon", "all"] as Shift[]).map((shift) => (
              <button
                key={shift}
                type="button"
                onClick={() => toggleShift(shift)}
                className={`
                  py-3 px-2 rounded-lg border-2 transition-all duration-150 text-sm font-medium
                  ${selectedShifts.has(shift)
                    ? "border-medical-blue bg-medical-blue-light text-medical-blue-dark"
                    : "border-gray-200 bg-white text-gray-600 hover:border-medical-blue/50"
                  }
                `}
              >
                {SHIFT_FULL_LABEL[shift]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Users className="w-4 h-4 inline mr-1 text-medical-blue" />
            陪诊上限人数
          </label>
          <div className="grid grid-cols-2 gap-2">
            {([1, 2] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setMaxElderly(n)}
                className={`
                  py-3 px-4 rounded-lg border-2 transition-all duration-150 font-medium
                  ${maxElderly === n
                    ? "border-medical-orange bg-orange-50 text-medical-orange-dark"
                    : "border-gray-200 bg-white text-gray-600 hover:border-medical-orange/50"
                  }
                `}
              >
                {n} 人 / 天
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <UserPlus className="w-5 h-5" />
          添加志愿者
        </button>
      </form>
    </div>
  );
}
