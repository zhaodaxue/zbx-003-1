import { useState } from "react";
import { X, AlertTriangle, AlertCircle } from "lucide-react";
import type { Assignment, CellShift, Conflict, Elderly, OutOfBoundsItem, Volunteer } from "@/types";
import { useScheduleStore } from "@/store/useScheduleStore";
import { getConflictTypeLabel, getOutOfBoundsReasonLabel } from "@/utils/conflictUtils";

interface Props {
  volunteer: Volunteer;
  date: string;
  shift: CellShift;
  cellAssignments: Assignment[];
  elderlyMap: Map<string, Elderly>;
  conflicts: Conflict[];
  outOfBoundsItems: OutOfBoundsItem[];
  isUnavailable: boolean;
  isWeekend: boolean;
  isDropTarget: boolean;
  onCellClick: () => void;
  onDragStart: (e: React.DragEvent, assignmentId: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  draggingAssignmentId: string | null;
}

export default function ScheduleCell({
  volunteer,
  date,
  shift,
  cellAssignments,
  elderlyMap,
  conflicts,
  outOfBoundsItems,
  isUnavailable,
  isWeekend,
  isDropTarget,
  onCellClick,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  draggingAssignmentId,
}: Props) {
  const dispatch = useScheduleStore((s) => s.dispatch);
  const [showConflictTooltip, setShowConflictTooltip] = useState(false);
  const [showOobTooltip, setShowOobTooltip] = useState(false);
  const [hoveredAssignmentId, setHoveredAssignmentId] = useState<string | null>(null);

  const hasConflict = conflicts.length > 0;
  const hasOutOfBounds = outOfBoundsItems.length > 0;

  const handleRemoveAssignment = (e: React.MouseEvent, assignmentId: string, elderlyName: string) => {
    e.stopPropagation();
    if (window.confirm(`确认取消「${elderlyName}」的陪诊安排？`)) {
      dispatch({ type: "REMOVE_ASSIGNMENT", payload: assignmentId });
    }
  };

  const handleCellClick = () => {
    if (isUnavailable) return;
    onCellClick();
  };

  const cellClasses = [
    "cell-base relative group",
    isUnavailable ? "cell-unavailable" : "cursor-pointer hover:border-medical-blue/40",
    hasConflict ? "cell-conflict" : "",
    !hasConflict && hasOutOfBounds ? "cell-out-of-bounds" : "",
    isDropTarget ? "drop-target-active" : "",
    isWeekend && !hasConflict && !hasOutOfBounds && !isDropTarget ? "bg-schedule-weekend" : "",
  ].join(" ");

  return (
    <div
      className={cellClasses}
      onClick={handleCellClick}
      onDragOver={!isUnavailable ? onDragOver : undefined}
      onDragLeave={onDragLeave}
      onDrop={!isUnavailable ? onDrop : undefined}
    >
      {hasConflict && (
        <div
          className="absolute top-1 right-1 z-10"
          onMouseEnter={() => setShowConflictTooltip(true)}
          onMouseLeave={() => setShowConflictTooltip(false)}
        >
          <AlertTriangle className="w-4 h-4 text-schedule-conflict-text fill-red-100" />
          {showConflictTooltip && (
            <div className="tooltip right-0 -top-2 translate-y-[-100%] w-60">
              <div className="font-bold text-red-200 mb-1.5">⚠️ 冲突提醒</div>
              <div className="space-y-1">
                {conflicts.map((c) => (
                  <div key={c.id} className="text-xs">
                    <span className="text-red-300 font-medium">
                      [{getConflictTypeLabel(c.type)}]
                    </span>
                    <span className="ml-1">{c.description}</span>
                  </div>
                ))}
              </div>
              <div className="absolute -bottom-1.5 right-3 w-3 h-3 bg-gray-900 rotate-45" />
            </div>
          )}
        </div>
      )}

      {!hasConflict && hasOutOfBounds && (
        <div
          className="absolute top-1 right-1 z-10"
          onMouseEnter={() => setShowOobTooltip(true)}
          onMouseLeave={() => setShowOobTooltip(false)}
        >
          <AlertCircle className="w-4 h-4 text-amber-600 fill-amber-100" />
          {showOobTooltip && (
            <div className="tooltip right-0 -top-2 translate-y-[-100%] w-60" style={{ backgroundColor: "#78350f" }}>
              <div className="font-bold text-amber-200 mb-1.5">🟠 越界待处理</div>
              <div className="space-y-1">
                {outOfBoundsItems.map((item) => (
                  <div key={item.id} className="text-xs">
                    <span className="text-amber-300 font-medium">
                      [{getOutOfBoundsReasonLabel(item.reason)}]
                    </span>
                    <span className="ml-1 text-amber-100">{item.description}</span>
                  </div>
                ))}
              </div>
              <div className="absolute -bottom-1.5 right-3 w-3 h-3 rotate-45" style={{ backgroundColor: "#78350f" }} />
            </div>
          )}
        </div>
      )}

      {isUnavailable ? (
        <div className="flex items-center justify-center h-full text-xs text-gray-400 italic">
          不可服务
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1.5 relative z-0">
            {cellAssignments.map((assignment) => {
              const elderly = elderlyMap.get(assignment.elderlyId);
              if (!elderly) return null;
              const isDragging = draggingAssignmentId === assignment.id;
              const isAssignmentOob = outOfBoundsItems.some(
                (o) => o.assignmentId === assignment.id,
              );
              return (
                <div
                  key={assignment.id}
                  className={`elderly-tag group/tag relative justify-between ${isDragging ? "dragging" : ""} ${isAssignmentOob ? "border-amber-500 bg-amber-100 text-amber-900" : ""}`}
                  draggable
                  onDragStart={(e) => {
                    e.stopPropagation();
                    onDragStart(e, assignment.id);
                  }}
                  onDragEnd={(e) => {
                    e.stopPropagation();
                    onDragEnd();
                  }}
                  onMouseEnter={() => setHoveredAssignmentId(assignment.id)}
                  onMouseLeave={() => setHoveredAssignmentId(null)}
                  title={`${elderly.name} - 点击拖动可调整分配${isAssignmentOob ? "（当前越界待处理）" : ""}`}
                >
                  <span className="truncate">
                    {isAssignmentOob ? "⚠️" : "👴"} {elderly.shortName}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleRemoveAssignment(e, assignment.id, elderly.name)}
                    className={`ml-1.5 p-0.5 rounded transition-all duration-150 ${
                      hoveredAssignmentId === assignment.id
                        ? "opacity-100 bg-red-100 text-red-500 hover:bg-red-200"
                        : "opacity-0"
                    }`}
                    title="移除"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {cellAssignments.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-xs text-gray-300 group-hover:text-medical-blue/50 transition-colors">
                + 点击添加
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
