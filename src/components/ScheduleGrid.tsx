import { useMemo, useState } from "react";
import { Users } from "lucide-react";
import type { Assignment, CellShift, Elderly, Volunteer } from "@/types";
import { useScheduleStore } from "@/store/useScheduleStore";
import { getWeekDates, isWeekend, parseDate } from "@/utils/dateUtils";
import { buildConflictCellMap, detectConflicts } from "@/utils/conflictUtils";
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

  const assignmentCellMap = useMemo(() => {
    const map = new Map<string, Assignment[]>();
    for (const a of weekAssignments) {
      const key = getCellKey(a.volunteerId, a.date, a.shift);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return map;
  }, [weekAssignments]);

  const handleCellClick = (v: Volunteer, date: string, shift: CellShift) => {
    setModal({
      open: true,
      volunteerId: v.id,
      volunteerName: v.name,
      date,
      shift,
    });
  };

  const isVolunteerAvailable = (v: Volunteer, date: string, shift: CellShift): boolean => {
    const targetDay = parseDate(date).getDay();
    const dateAvailable = v.availableDates.some(
      (d) => parseDate(d).getDay() === targetDay,
    );
    if (!dateAvailable) return false;
    return (
      v.availableShifts.includes("all") || v.availableShifts.includes(shift)
    );
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
    if (!assignmentId || assignmentId === draggingAssignmentId) {
      const realId = assignmentId || draggingAssignmentId;
      if (realId) {
        dispatch({
          type: "MOVE_ASSIGNMENT",
          payload: {
            assignmentId: realId,
            newVolunteerId,
            newDate,
            newShift,
          },
        });
      }
    }
    setDraggingAssignmentId(null);
    setDropTargetKey(null);
  };

  if (volunteers.length === 0) {
    return (
      <div className="card p-12 text-center">
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
      </div>
    );
  }

  return (
    <>
      <div className="card overflow-hidden rounded-b-xl">
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
