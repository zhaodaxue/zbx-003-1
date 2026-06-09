import { useEffect, useMemo, useState } from "react";
import { X, Edit3, Users, Clock, CalendarDays, AlertTriangle } from "lucide-react";
import type { Shift, Volunteer } from "@/types";
import { SHIFT_FULL_LABEL } from "@/types";
import { useScheduleStore } from "@/store/useScheduleStore";
import { getWeekDates, parseDate } from "@/utils/dateUtils";
import { detectOutOfBounds, isVolunteerAvailable } from "@/utils/conflictUtils";

interface Props {
  open: boolean;
  onClose: () => void;
  volunteer: Volunteer | null;
}

export default function EditVolunteerModal({ open, onClose, volunteer }: Props) {
  const dispatch = useScheduleStore((s) => s.dispatch);
  const assignments = useScheduleStore((s) => s.assignments);
  const elderlyList = useScheduleStore((s) => s.elderlyList);
  const currentWeekStart = useScheduleStore((s) => s.currentWeekStart);

  const [name, setName] = useState("");
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [selectedShifts, setSelectedShifts] = useState<Set<Shift>>(new Set());
  const [maxElderly, setMaxElderly] = useState<1 | 2>(1);
  const [showConfirm, setShowConfirm] = useState(false);

  const weekDates = useMemo(() => getWeekDates(currentWeekStart), [currentWeekStart]);

  useEffect(() => {
    if (open && volunteer) {
      setName(volunteer.name);
      setSelectedDates(new Set(volunteer.availableDates));
      setSelectedShifts(new Set(volunteer.availableShifts));
      setMaxElderly(volunteer.maxElderly);
      setShowConfirm(false);
    }
  }, [open, volunteer]);

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
    name.trim().length > 0 && selectedDates.size > 0 && selectedShifts.size > 0 && volunteer;

  const simulatedVolunteer: Volunteer | null = useMemo(() => {
    if (!volunteer) return null;
    return {
      ...volunteer,
      name: name.trim(),
      availableDates: Array.from(selectedDates).sort(),
      availableShifts: Array.from(selectedShifts),
      maxElderly,
    };
  }, [volunteer, name, selectedDates, selectedShifts, maxElderly]);

  const impactAnalysis = useMemo(() => {
    if (!volunteer || !simulatedVolunteer) {
      return { affectedIds: [] as string[], willBeOutOfBounds: [] as string[], totalCount: 0 };
    }

    const vid = volunteer.id;
    const affectedAssignments = assignments.filter((a) => a.volunteerId === vid);
    const affectedIds: string[] = [];
    const willBeOutOfBounds: string[] = [];

    for (const a of affectedAssignments) {
      let isAffected = false;
      const oldAvail = isVolunteerAvailable(volunteer, a.date, a.shift);
      const newAvail = isVolunteerAvailable(simulatedVolunteer, a.date, a.shift);
      if (oldAvail && !newAvail) {
        isAffected = true;
      }

      const oldSameDay = affectedAssignments.filter((x) => x.date === a.date).length;
      const oldOver = oldSameDay > volunteer.maxElderly;
      const newSameDay = affectedAssignments.filter((x) => x.date === a.date).length;
      const newOver = newSameDay > simulatedVolunteer.maxElderly;
      if (!oldOver && newOver) {
        isAffected = true;
      }

      if (isAffected) {
        affectedIds.push(a.id);
      }
    }

    const simulatedVolunteers = useScheduleStore
      .getState()
      .volunteers.map((v) => (v.id === vid ? simulatedVolunteer : v));

    const oob = detectOutOfBounds(assignments, simulatedVolunteers);
    for (const item of oob) {
      if (item.volunteerId === vid && !willBeOutOfBounds.includes(item.assignmentId)) {
        willBeOutOfBounds.push(item.assignmentId);
      }
    }

    const uniqueIds = new Set([...affectedIds, ...willBeOutOfBounds]);

    return {
      affectedIds: Array.from(uniqueIds),
      willBeOutOfBounds: Array.from(uniqueIds),
      totalCount: uniqueIds.size,
    };
  }, [volunteer, simulatedVolunteer, assignments]);

  const hasChanges = useMemo(() => {
    if (!volunteer || !simulatedVolunteer) return false;
    return (
      volunteer.name !== simulatedVolunteer.name ||
      volunteer.maxElderly !== simulatedVolunteer.maxElderly ||
      volunteer.availableDates.length !== simulatedVolunteer.availableDates.length ||
      volunteer.availableDates.some((d) => !simulatedVolunteer.availableDates.includes(d)) ||
      volunteer.availableShifts.length !== simulatedVolunteer.availableShifts.length ||
      volunteer.availableShifts.some((s) => !simulatedVolunteer.availableShifts.includes(s))
    );
  }, [volunteer, simulatedVolunteer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !simulatedVolunteer) return;

    if (!hasChanges) {
      onClose();
      return;
    }

    if (impactAnalysis.totalCount > 0) {
      setShowConfirm(true);
    } else {
      doSave();
    }
  };

  const doSave = () => {
    if (!simulatedVolunteer) return;
    dispatch({ type: "EDIT_VOLUNTEER", payload: simulatedVolunteer });
    onClose();
  };

  const handleConfirmSave = () => {
    setShowConfirm(false);
    doSave();
  };

  const handleCancelConfirm = () => {
    setShowConfirm(false);
  };

  const formatDateShort = (date: string) => {
    const d = parseDate(date);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const getAffectedDetails = () => {
    if (!volunteer) return "";
    const lines: string[] = [];
    const vid = volunteer.id;
    const elderlyMap = new Map(elderlyList.map((e) => [e.id, e.name]));

    for (const aId of impactAnalysis.affectedIds.slice(0, 10)) {
      const a = assignments.find((x) => x.id === aId);
      if (!a) continue;
      const eName = elderlyMap.get(a.elderlyId) ?? "未知老人";
      const shiftName = a.shift === "morning" ? "上午" : "下午";
      lines.push(`· ${formatDateShort(a.date)} ${shiftName}：${eName}`);
    }
    if (impactAnalysis.affectedIds.length > 10) {
      lines.push(`…… 等共 ${impactAnalysis.affectedIds.length} 条`);
    }
    return lines.join("\n");
  };

  if (!open) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      if (showConfirm) {
        setShowConfirm(false);
      } else {
        onClose();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in max-h-[90vh] flex flex-col">
        <div className="bg-medical-blue px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 text-white">
            <Edit3 className="w-6 h-6" />
            <div>
              <h3 className="text-lg font-bold">编辑志愿者</h3>
              <p className="text-sm opacity-90">修改可服务日期、时段或陪诊上限</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto scrollbar-thin">
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

          {hasChanges && impactAnalysis.totalCount > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <div className="font-bold text-amber-800 mb-1">
                    ⚠️ 保存后将影响 {impactAnalysis.totalCount} 条既有排班
                  </div>
                  <div className="text-amber-700 whitespace-pre-line text-xs leading-relaxed">
                    {getAffectedDetails()}
                  </div>
                  <div className="text-amber-600 mt-2 text-xs">
                    不符合新规则的分配将标记为「越界待处理」，请协调员后续手动调整。
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              取消
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <Edit3 className="w-5 h-5" />
              保存修改
            </button>
          </div>
        </form>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleCancelConfirm}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in">
            <div className="px-6 py-5">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-800 mb-2">确认保存修改？</h3>
                  <div className="text-sm text-gray-600 space-y-2">
                    <p>
                      本次修改将使 <span className="font-bold text-amber-700">{impactAnalysis.totalCount}</span>{" "}
                      条既有排班变成「越界待处理」状态。
                    </p>
                    <p className="text-gray-500 text-xs">
                      越界分配不会被自动删除，但会以特殊样式标注并在底部冲突区单独汇总，
                      协调员需手动移走或删除后标记才会消失。
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button
                type="button"
                onClick={handleCancelConfirm}
                className="btn-secondary flex-1"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                className="btn-accent flex-1"
              >
                确认，继续保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
