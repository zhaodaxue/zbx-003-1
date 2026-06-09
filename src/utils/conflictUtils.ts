import type { Assignment, Conflict, Volunteer } from "@/types";
import { CONFLICT_LABEL } from "@/types";
import { generateId } from "./dateUtils";

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
