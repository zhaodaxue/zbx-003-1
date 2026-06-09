import type {
  Assignment,
  CellShift,
  Conflict,
  OutOfBoundsItem,
  OutOfBoundsReason,
  Volunteer,
} from "@/types";
import { CONFLICT_LABEL, OUT_OF_BOUNDS_LABEL } from "@/types";
import { generateId, parseDate } from "./dateUtils";

function getCellKey(volunteerId: string, date: string, shift: string): string {
  return `${volunteerId}_${date}_${shift}`;
}

export function detectConflicts(
  assignments: Assignment[],
  volunteers: Volunteer[],
): Conflict[] {
  const conflicts: Conflict[] = [];
  const volunteerMap = new Map(volunteers.map((v) => [v.id, v]));

  const doubleShiftMap = new Map<string, Assignment[]>();
  const elderlyDateMap = new Map<string, Assignment[]>();
  const volunteerDateMap = new Map<string, Assignment[]>();

  for (const a of assignments) {
    const doubleShiftKey = getCellKey(a.volunteerId, a.date, a.shift);
    if (!doubleShiftMap.has(doubleShiftKey)) doubleShiftMap.set(doubleShiftKey, []);
    doubleShiftMap.get(doubleShiftKey)!.push(a);

    const elderlyDateKey = `${a.elderlyId}_${a.date}`;
    if (!elderlyDateMap.has(elderlyDateKey)) elderlyDateMap.set(elderlyDateKey, []);
    elderlyDateMap.get(elderlyDateKey)!.push(a);

    const volunteerDateKey = `${a.volunteerId}_${a.date}`;
    if (!volunteerDateMap.has(volunteerDateKey)) volunteerDateMap.set(volunteerDateKey, []);
    volunteerDateMap.get(volunteerDateKey)!.push(a);
  }

  for (const [cellKey, group] of doubleShiftMap) {
    if (group.length > 1) {
      const volunteer = volunteerMap.get(group[0].volunteerId);
      conflicts.push({
        id: generateId(),
        type: "VOLUNTEER_DOUBLE_SHIFT",
        description: `志愿者「${volunteer?.name ?? "未知"}」在${group[0].date} ${aShiftLabel(group[0].shift)}时段被重复登记了${group.length}位老人`,
        relatedAssignmentIds: group.map((a) => a.id),
        affectedCellKeys: [cellKey],
      });
    }
  }

  for (const [, group] of elderlyDateMap) {
    const volunteerIds = new Set(group.map((a) => a.volunteerId));
    if (volunteerIds.size > 1) {
      const cellKeys = group.map((a) => getCellKey(a.volunteerId, a.date, a.shift));
      const volunteerNames = group
        .map((a) => volunteerMap.get(a.volunteerId)?.name ?? "未知")
        .filter((v, i, arr) => arr.indexOf(v) === i)
        .join("、");
      conflicts.push({
        id: generateId(),
        type: "ELDERLY_DOUBLE_BOOKED",
        description: `老人在${group[0].date}被志愿者「${volunteerNames}」重复登记陪同`,
        relatedAssignmentIds: group.map((a) => a.id),
        affectedCellKeys: cellKeys,
      });
    }
  }

  for (const [volunteerDateKey, group] of volunteerDateMap) {
    const volunteerId = group[0].volunteerId;
    const volunteer = volunteerMap.get(volunteerId);
    if (!volunteer) continue;
    if (group.length > volunteer.maxElderly) {
      const cellKeys = group.map((a) => getCellKey(a.volunteerId, a.date, a.shift));
      conflicts.push({
        id: generateId(),
        type: "VOLUNTEER_OVER_CAPACITY",
        description: `志愿者「${volunteer.name}」在${group[0].date}共登记${group.length}人，超过其上限${volunteer.maxElderly}人`,
        relatedAssignmentIds: group.map((a) => a.id),
        affectedCellKeys: cellKeys,
      });
    }
  }

  return conflicts;
}

function aShiftLabel(shift: string): string {
  return shift === "morning" ? "上午" : "下午";
}

export function buildConflictCellMap(conflicts: Conflict[]): Map<string, Conflict[]> {
  const map = new Map<string, Conflict[]>();
  for (const c of conflicts) {
    for (const key of c.affectedCellKeys) {
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
  }
  return map;
}

export function getConflictTypeLabel(type: Conflict["type"]): string {
  return CONFLICT_LABEL[type];
}

export function isVolunteerAvailable(
  volunteer: Volunteer,
  date: string,
  shift: CellShift,
): boolean {
  const targetDay = parseDate(date).getDay();
  const dateAvailable = volunteer.availableDates.some(
    (d) => parseDate(d).getDay() === targetDay,
  );
  if (!dateAvailable) return false;
  return volunteer.availableShifts.includes("all") || volunteer.availableShifts.includes(shift);
}

export function detectOutOfBounds(
  assignments: Assignment[],
  volunteers: Volunteer[],
): OutOfBoundsItem[] {
  const result: OutOfBoundsItem[] = [];
  const volunteerMap = new Map(volunteers.map((v) => [v.id, v]));

  const volunteerDateGroups = new Map<string, Assignment[]>();
  for (const a of assignments) {
    const key = `${a.volunteerId}_${a.date}`;
    if (!volunteerDateGroups.has(key)) volunteerDateGroups.set(key, []);
    volunteerDateGroups.get(key)!.push(a);
  }

  for (const a of assignments) {
    const volunteer = volunteerMap.get(a.volunteerId);
    if (!volunteer) continue;

    const targetDay = parseDate(a.date).getDay();
    const dateAvailable = volunteer.availableDates.some(
      (d) => parseDate(d).getDay() === targetDay,
    );
    const shiftAvailable =
      volunteer.availableShifts.includes("all") ||
      volunteer.availableShifts.includes(a.shift);

    if (!dateAvailable) {
      const elderlyName = "";
      result.push({
        id: generateId(),
        assignmentId: a.id,
        volunteerId: a.volunteerId,
        reason: "DATE_UNAVAILABLE",
        description: `志愿者「${volunteer.name}」在${a.date}非可服务日期，存在越界分配`,
        cellKey: getCellKey(a.volunteerId, a.date, a.shift),
      });
      continue;
    }

    if (!shiftAvailable) {
      result.push({
        id: generateId(),
        assignmentId: a.id,
        volunteerId: a.volunteerId,
        reason: "SHIFT_UNAVAILABLE",
        description: `志愿者「${volunteer.name}」在${a.date}${aShiftLabel(a.shift)}非可服务时段，存在越界分配`,
        cellKey: getCellKey(a.volunteerId, a.date, a.shift),
      });
      continue;
    }
  }

  for (const [, group] of volunteerDateGroups) {
    const volunteerId = group[0].volunteerId;
    const volunteer = volunteerMap.get(volunteerId);
    if (!volunteer) continue;
    const targetDay = parseDate(group[0].date).getDay();
    const dateAvailable = volunteer.availableDates.some(
      (d) => parseDate(d).getDay() === targetDay,
    );
    if (!dateAvailable) continue;

    const validAssignments = group.filter((a) => {
      const shiftOk =
        volunteer.availableShifts.includes("all") ||
        volunteer.availableShifts.includes(a.shift);
      return shiftOk;
    });

    if (validAssignments.length > volunteer.maxElderly) {
      const sorted = [...validAssignments].sort((a, b) => {
        if (a.shift === b.shift) return a.id.localeCompare(b.id);
        return a.shift === "morning" ? -1 : 1;
      });
      const overflow = sorted.slice(volunteer.maxElderly);
      for (const a of overflow) {
        result.push({
          id: generateId(),
          assignmentId: a.id,
          volunteerId: a.volunteerId,
          reason: "OVER_CAPACITY",
          description: `志愿者「${volunteer.name}」在${a.date}共登记${validAssignments.length}人，超过上限${volunteer.maxElderly}人，存在越界分配`,
          cellKey: getCellKey(a.volunteerId, a.date, a.shift),
        });
      }
    }
  }

  return result;
}

export function buildOutOfBoundsCellMap(
  items: OutOfBoundsItem[],
): Map<string, OutOfBoundsItem[]> {
  const map = new Map<string, OutOfBoundsItem[]>();
  for (const item of items) {
    if (!map.has(item.cellKey)) map.set(item.cellKey, []);
    map.get(item.cellKey)!.push(item);
  }
  return map;
}

export function getOutOfBoundsReasonLabel(reason: OutOfBoundsReason): string {
  return OUT_OF_BOUNDS_LABEL[reason];
}

export interface PlacementValidationResult {
  valid: boolean;
  reasons: string[];
}

export function validateAddAssignment(
  assignments: Assignment[],
  volunteers: Volunteer[],
  volunteerId: string,
  elderlyId: string,
  date: string,
  shift: CellShift,
  elderlyName: string,
): PlacementValidationResult {
  const reasons: string[] = [];
  const volunteer = volunteers.find((v) => v.id === volunteerId);

  if (!volunteer) {
    return { valid: false, reasons: ["志愿者不存在"] };
  }

  if (!isVolunteerAvailable(volunteer, date, shift)) {
    const targetDay = parseDate(date).getDay();
    const dateAvailable = volunteer.availableDates.some(
      (d) => parseDate(d).getDay() === targetDay,
    );
    if (!dateAvailable) {
      reasons.push(`志愿者「${volunteer.name}」在${date}非可服务日期`);
    } else {
      reasons.push(`志愿者「${volunteer.name}」在${date}${aShiftLabel(shift)}非可服务时段`);
    }
  }

  const cellExisting = assignments.filter(
    (a) => a.volunteerId === volunteerId && a.date === date && a.shift === shift,
  );
  if (cellExisting.length > 0) {
    reasons.push(`该时段已分配老人，再次分配将触发【志愿者同时段重复】冲突`);
  }

  const elderlySameDay = assignments.filter((a) => a.elderlyId === elderlyId && a.date === date);
  if (elderlySameDay.length > 0) {
    const otherVolunteerIds = new Set(
      elderlySameDay.map((a) => a.volunteerId).filter((vid) => vid !== volunteerId),
    );
    if (otherVolunteerIds.size > 0 || elderlySameDay.some((a) => a.shift !== shift)) {
      reasons.push(
        `老人「${elderlyName}」在${date}已存在其他登记，再次分配将触发【老人同日重复登记】冲突`,
      );
    }
  }

  const sameDayTotal = assignments.filter(
    (a) => a.volunteerId === volunteerId && a.date === date,
  ).length;
  if (sameDayTotal >= volunteer.maxElderly) {
    reasons.push(
      `志愿者「${volunteer.name}」在${date}已排${sameDayTotal}人，达到上限${volunteer.maxElderly}人，再分配将触发【志愿者陪诊人数超上限】冲突`,
    );
  }

  return { valid: reasons.length === 0, reasons };
}

export function validateMoveAssignment(
  assignments: Assignment[],
  volunteers: Volunteer[],
  assignmentId: string,
  newVolunteerId: string,
  newDate: string,
  newShift: CellShift,
): PlacementValidationResult {
  const reasons: string[] = [];
  const movingAssignment = assignments.find((a) => a.id === assignmentId);
  const newVolunteer = volunteers.find((v) => v.id === newVolunteerId);

  if (!movingAssignment) {
    return { valid: false, reasons: ["待移动的分配不存在"] };
  }
  if (!newVolunteer) {
    return { valid: false, reasons: ["目标志愿者不存在"] };
  }

  const elderlyId = movingAssignment.elderlyId;
  const elderlyName = (() => {
    const e = assignments.find((a) => a.elderlyId === elderlyId);
    return e ? `ID:${elderlyId.slice(-4)}` : `ID:${elderlyId.slice(-4)}`;
  })();

  const otherAssignments = assignments.filter((a) => a.id !== assignmentId);

  if (!isVolunteerAvailable(newVolunteer, newDate, newShift)) {
    const targetDay = parseDate(newDate).getDay();
    const dateAvailable = newVolunteer.availableDates.some(
      (d) => parseDate(d).getDay() === targetDay,
    );
    if (!dateAvailable) {
      reasons.push(`志愿者「${newVolunteer.name}」在${newDate}非可服务日期`);
    } else {
      reasons.push(`志愿者「${newVolunteer.name}」在${newDate}${aShiftLabel(newShift)}非可服务时段`);
    }
  }

  const cellExisting = otherAssignments.filter(
    (a) => a.volunteerId === newVolunteerId && a.date === newDate && a.shift === newShift,
  );
  if (cellExisting.length > 0) {
    reasons.push(`目标时段已分配老人，移动将触发【志愿者同时段重复】冲突`);
  }

  const elderlySameDay = otherAssignments.filter(
    (a) => a.elderlyId === elderlyId && a.date === newDate,
  );
  const hasOtherVolunteer = elderlySameDay.some((a) => a.volunteerId !== newVolunteerId);
  const hasOtherShift = elderlySameDay.some((a) => a.shift !== newShift);
  if (hasOtherVolunteer || hasOtherShift) {
    reasons.push(`老人在${newDate}已存在其他登记，移动将触发【老人同日重复登记】冲突`);
  }

  const sameDayTotal = otherAssignments.filter(
    (a) => a.volunteerId === newVolunteerId && a.date === newDate,
  ).length;
  if (sameDayTotal >= newVolunteer.maxElderly) {
    reasons.push(
      `志愿者「${newVolunteer.name}」在${newDate}已排${sameDayTotal}人，达到上限${newVolunteer.maxElderly}人，移动将触发【志愿者陪诊人数超上限】冲突`,
    );
  }

  return { valid: reasons.length === 0, reasons };
}
