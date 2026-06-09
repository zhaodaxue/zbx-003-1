import { useMemo, useState } from "react";
import { Users, AlertOctagon } from "lucide-react";
import type { Assignment, CellShift, Elderly, Volunteer } from "@/types";
import { useScheduleStore } from "@/store/useScheduleStore";
import { getWeekDates, isWeekend, parseDate } from "@/utils/dateUtils";
import {
  buildConflictCellMap,
  buildOutOfBoundsCellMap,
  detectConflicts,
  detectOutOfBounds,
  isVolunteerAvailable,
  validateMoveAssignment,
} from "@/utils/conflictUtils";
import ScheduleCell from "./ScheduleCell";
import AddElderlyModal from "./AddElderlyModal";

interface ModalState {
  open: boolean;
  volunteerId: string;
  volunteerName: string;
  date: string;
  shift: CellShift;
}

const EMPTY_MODAL: ModalState = {
  open: false,
  volunteerId: "",
  volunteerName: "",
  date: "",
  shift: "morning",
};

const getCellKey = (vid: string, date: string, shift: CellShift) =>
  `${vid}_${date}_${shift}`;

export default function ScheduleGrid() {
  const volunteers = useScheduleStore((s) => s.volunteers);
  const assignments = useScheduleStore((s) => s.assignments);
  const elderlyList = useScheduleStore((s) => s.elderlyList);
  const currentWeekStart = useScheduleStore((s) => s.currentWeekStart);
  const dispatch = useScheduleStore((s) => s.dispatch);

  const [modal, setModal] = useState<ModalState>(EMPTY_MODAL);
  const [draggingAssignmentId, setDraggingAssignmentId] = useState<string | null>(null);
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);
  const [blockedToast, setBlockedToast] = useState<{ show: boolean; msg: string }>({
    show: false,
    msg: "",
  });

  const weekDates = useMemo(() => getWeekDates(currentWeekStart), [currentWeekStart]);

  const elderlyMap = useMemo(() => {
    const map = new Map<string, Elderly>();
    for (const e of elderlyList) map.set(e.id, e);
    return map;
  }, [elderlyList]);

  const weekAssignments = useMemo(
    () => assignments.filter((a) => weekDates.includes(a.date)),
    [assignments, weekDates],
  );

  const conflicts = useMemo(
    () => detectConflicts(weekAssignments, volunteers),
    [weekAssignments, volunteers],
  );

  const conflictCellMap = useMemo(
    () => buildConflictCellMap(conflicts),
    [conflicts],
  );

  const outOfBounds = useMemo(
    () => detectOutOfBounds(weekAssignments, volunteers),
    [weekAssignments, volunteers],
  );

  const outOfBoundsCellMap = useMemo(
    () => buildOutOfBoundsCellMap(outOfBounds),
    [outOfBounds],
  );

  const assignmentCellMap = useMemo(() => {
    const map = new Map<string, Assignment[]>();
    for (const a of weekAssignments) {
      const key = getCellKey(a.volunteerId, a.date, a.shift);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return map;
  }, [weekAssignments]);

  const showBlockedMessage = (reasons: string[]) => {
    setBlockedToast({ show: true, msg: reasons.join("\n") });
    setTimeout(() => setBlockedToast({ show: false, msg: "" }), 3500);
  };

  const handleCellClick = (v: Volunteer, date: string, shift: CellShift) => {
    if (!isVolunteerAvailable(v, date, shift)) {
      const targetDay = parseDate(date).getDay();
      const dateAvailable = v.availableDates.some(
        (d) => parseDate(d).getDay() === targetDay,
      );
      const reason = !dateAvailable
        ? `志愿者「${v.name}」在${date}非可服务日期，无法分配`
        : `志愿者「${v.name}」在${date}${shift === "morning" ? "上午" : "下午"}非可服务时段，无法分配`;
      showBlockedMessage([reason]);
      return;
    }
    setModal({
      open: true,
      volunteerId: v.id,
      volunteerName: v.name,
      date,
      shift,
    });
  };

  const handleDragStart = (e: React.DragEvent, assignmentId: string) => {
    setDraggingAssignmentId(assignmentId);
    e.dataTransfer.setData("text/plain", assignmentId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggingAssignmentId(null);
    setDropTargetKey(null);
  };

  const handleDragOver = (e: React.DragEvent, cellKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dropTargetKey !== cellKey) {
      setDropTargetKey(cellKey);
    }
  };

  const handleDragLeave = (cellKey: string) => {
    if (dropTargetKey === cellKey) {
      setDropTargetKey(null);
    }
  };

  const handleDrop = (
    e: React.DragEvent,
    newVolunteerId: string,
    newDate: string,
    newShift: CellShift,
  ) => {
    e.preventDefault();
    const assignmentId = e.dataTransfer.getData("text/plain");
    const realId = assignmentId || draggingAssignmentId;

    if (!realId) {
      setDraggingAssignmentId(null);
      setDropTargetKey(null);
      return;
    }

    const movingAssignment = assignments.find((a) => a.id === realId);
    if (movingAssignment) {
      if (
        movingAssignment.volunteerId === newVolunteerId &&
        movingAssignment.date === newDate &&
        movingAssignment.shift === newShift
      ) {
        setDraggingAssignmentId(null);
        setDropTargetKey(null);
        return;
      }
    }

    const validation = validateMoveAssignment(
      weekAssignments,
      volunteers,
      realId,
      newVolunteerId,
      newDate,
      newShift,
    );

    if (!validation.valid) {
      showBlockedMessage(validation.reasons);
      setDraggingAssignmentId(null);
      setDropTargetKey(null);
      return;
    }

    dispatch({
      type: "MOVE_ASSIGNMENT",
      payload: {
        assignmentId: realId,
        newVolunteerId,
        newDate,
        newShift,
      },
    });
    setDraggingAssignmentId(null);
    setDropTargetKey(null);
  };

  if (volunteers.length === 0) {
    return (
      <div className="card p-12 text-center relative">
        <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-xl font-bold text-gray-600 mb-2">暂无志愿者</h3>
        <p className="text-gray-400 mb-6">
          请先在左侧录入志愿者信息，排班看板将自动生成
        </p>
        <div className="flex items-center justify-center gap-8 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-medical-blue-light flex items-center justify-center text-medical-blue-dark">
              1
            </span>
            左侧填写志愿者信息
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-medical-blue-light flex items-center justify-center text-medical-blue-dark">
              2
            </span>
            点击「添加志愿者」
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-medical-blue-light flex items-center justify-center text-medical-blue-dark">
              3
            </span>
            在右侧网格分配老人
          </div>
        </div>

        {blockedToast.show && (
          <BlockedToast msg={blockedToast.msg} onClose={() => setBlockedToast({ show: false, msg: "" })} />
        )}
      </div>
    );
  }

  return (
    <>
      <div className="card overflow-hidden rounded-b-xl relative">
        <div className="overflow-x-auto scrollbar-thin">
          <div
            className="grid"
            style={{ gridTemplateColumns: "140px repeat(14, minmax(72px, 1fr))" }}
          >
            {volunteers.map((volunteer, idx) => {
              const dayCells: React.ReactElement[] = [];
              for (const date of weekDates) {
                const weekend = isWeekend(date);
                for (const shift of ["morning", "afternoon"] as CellShift[]) {
                  const cellKey = getCellKey(volunteer.id, date, shift);
                  const cellAssignments = assignmentCellMap.get(cellKey) ?? [];
                  const cellConflicts = conflictCellMap.get(cellKey) ?? [];
                  const cellOutOfBounds = outOfBoundsCellMap.get(cellKey) ?? [];
                  const unavailable = !isVolunteerAvailable(volunteer, date, shift);

                  dayCells.push(
                    <ScheduleCell
                      key={cellKey}
                      volunteer={volunteer}
                      date={date}
                      shift={shift}
                      cellAssignments={cellAssignments}
                      elderlyMap={elderlyMap}
                      conflicts={cellConflicts}
                      outOfBoundsItems={cellOutOfBounds}
                      isUnavailable={unavailable}
                      isWeekend={weekend}
                      isDropTarget={dropTargetKey === cellKey}
                      onCellClick={() => handleCellClick(volunteer, date, shift)}
                      onDragStart={(e, id) => handleDragStart(e, id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, cellKey)}
                      onDragLeave={() => handleDragLeave(cellKey)}
                      onDrop={(e) => handleDrop(e, volunteer.id, date, shift)}
                      draggingAssignmentId={draggingAssignmentId}
                    />,
                  );
                }
              }

              return (
                <div
                  key={volunteer.id}
                  className="contents"
                  style={{ display: "contents" }}
                >
                  <div
                    className={`px-4 py-2 border-r border-schedule-border flex flex-col justify-center ${
                      idx % 2 === 0 ? "bg-gray-50" : "bg-white"
                    }`}
                  >
                    <div className="font-bold text-gray-800 text-sm truncate">
                      {volunteer.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      上限 {volunteer.maxElderly} 人/天
                    </div>
                  </div>
                  {dayCells}
                </div>
              );
            })}
          </div>
        </div>

        {blockedToast.show && (
          <BlockedToast msg={blockedToast.msg} onClose={() => setBlockedToast({ show: false, msg: "" })} />
        )}
      </div>

      <AddElderlyModal
        open={modal.open}
        onClose={() => setModal(EMPTY_MODAL)}
        volunteerId={modal.volunteerId}
        volunteerName={modal.volunteerName}
        date={modal.date}
        shift={modal.shift}
      />
    </>
  );
}

function BlockedToast({ msg, onClose }: { msg: string; onClose: () => void }) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 animate-in">
      <div className="bg-red-50 border-2 border-red-200 rounded-xl shadow-lg px-5 py-4 max-w-lg">
        <div className="flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold text-red-700 text-sm mb-1">❌ 操作被拦截</div>
            <div className="text-red-600 text-xs whitespace-pre-line leading-relaxed">
              {msg}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-red-400 hover:text-red-600 text-sm ml-2"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
