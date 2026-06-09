import { useState } from "react";
import { Trash2, Users, CalendarCheck, Edit3 } from "lucide-react";
import type { Volunteer } from "@/types";
import { SHIFT_FULL_LABEL } from "@/types";
import { useScheduleStore } from "@/store/useScheduleStore";
import { parseDate } from "@/utils/dateUtils";
import EditVolunteerModal from "./EditVolunteerModal";

export default function VolunteerList() {
  const volunteers = useScheduleStore((s) => s.volunteers);
  const assignments = useScheduleStore((s) => s.assignments);
  const dispatch = useScheduleStore((s) => s.dispatch);

  const [editingVolunteer, setEditingVolunteer] = useState<Volunteer | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const getAssignmentCount = (vid: string): number => {
    return assignments.filter((a) => a.volunteerId === vid).length;
  };

  const formatDateShort = (date: string) => {
    const d = parseDate(date);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const formatDates = (dates: string[]) => {
    if (dates.length === 0) return "无";
    const sorted = [...dates].sort();
    if (sorted.length <= 3) {
      return sorted.map(formatDateShort).join("、");
    }
    return `${formatDateShort(sorted[0])} ~ ${formatDateShort(sorted[sorted.length - 1])}（${sorted.length}天）`;
  };

  const handleRemove = (v: Volunteer) => {
    const count = getAssignmentCount(v.id);
    const msg =
      count > 0
        ? `确认删除志愿者「${v.name}」？将同时删除 TA 的 ${count} 条排班记录。`
        : `确认删除志愿者「${v.name}」？`;
    if (window.confirm(msg)) {
      dispatch({ type: "REMOVE_VOLUNTEER", payload: v.id });
    }
  };

  const handleEdit = (v: Volunteer) => {
    setEditingVolunteer(v);
    setModalOpen(true);
  };

  return (
    <div className="card p-5 mt-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-medical-blue" />
          <h2 className="text-lg font-bold text-gray-800">志愿者列表</h2>
        </div>
        <span className="badge bg-gray-100 text-gray-600">
          共 {volunteers.length} 人
        </span>
      </div>

      {volunteers.length === 0 ? (
        <div className="py-8 text-center text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">还没有录入志愿者</p>
          <p className="text-xs mt-1">请使用上方表单添加</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[calc(100vh-720px)] min-h-[120px] overflow-y-auto scrollbar-thin pr-1">
          {volunteers.map((v) => {
            const count = getAssignmentCount(v.id);
            return (
              <div
                key={v.id}
                className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-medical-blue/30 hover:bg-white transition-all duration-200 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-800 text-base truncate">
                        {v.name}
                      </h3>
                      <span className="badge bg-orange-50 text-medical-orange-dark text-xs whitespace-nowrap">
                        上限 {v.maxElderly} 人
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1">
                      {v.availableShifts.map((s) => (
                        <span
                          key={s}
                          className="badge bg-medical-blue-light text-medical-blue-dark text-xs"
                        >
                          {SHIFT_FULL_LABEL[s]}
                        </span>
                      ))}
                    </div>

                    <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                      <CalendarCheck className="w-3.5 h-3.5 text-gray-400" />
                      <span className="truncate">{formatDates(v.availableDates)}</span>
                    </div>

                    {count > 0 && (
                      <div className="mt-1 text-xs text-medical-blue">
                        已排 {count} 条陪诊记录
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleEdit(v)}
                      className="btn-danger-sm opacity-0 group-hover:opacity-100 transition-opacity text-medical-blue hover:bg-medical-blue-light p-2 rounded-md"
                      aria-label={`编辑${v.name}`}
                      title="编辑志愿者"
                    >
                      <Edit3 className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(v)}
                      className="btn-danger-sm opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      aria-label={`删除${v.name}`}
                      title="删除志愿者"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <EditVolunteerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        volunteer={editingVolunteer}
      />
    </div>
  );
}
