export type Shift = "morning" | "afternoon" | "all";

export type CellShift = "morning" | "afternoon";

export type ConflictType =
  | "VOLUNTEER_DOUBLE_SHIFT"
  | "ELDERLY_DOUBLE_BOOKED"
  | "VOLUNTEER_OVER_CAPACITY";

export type OutOfBoundsReason =
  | "DATE_UNAVAILABLE"
  | "SHIFT_UNAVAILABLE"
  | "OVER_CAPACITY";

export interface Volunteer {
  id: string;
  name: string;
  availableDates: string[];
  availableShifts: Shift[];
  maxElderly: 1 | 2;
}

export interface Elderly {
  id: string;
  name: string;
  shortName: string;
}

export interface Assignment {
  id: string;
  volunteerId: string;
  elderlyId: string;
  date: string;
  shift: CellShift;
}

export interface Conflict {
  id: string;
  type: ConflictType;
  description: string;
  relatedAssignmentIds: string[];
  affectedCellKeys: string[];
}

export interface OutOfBoundsItem {
  id: string;
  assignmentId: string;
  volunteerId: string;
  reason: OutOfBoundsReason;
  description: string;
  cellKey: string;
}

export interface AppState {
  volunteers: Volunteer[];
  elderlyList: Elderly[];
  assignments: Assignment[];
  currentWeekStart: string;
}

export type Action =
  | { type: "ADD_VOLUNTEER"; payload: Omit<Volunteer, "id"> }
  | { type: "REMOVE_VOLUNTEER"; payload: string }
  | { type: "EDIT_VOLUNTEER"; payload: Volunteer }
  | { type: "ADD_ELDERLY"; payload: Omit<Elderly, "id" | "shortName"> }
  | {
      type: "ADD_ASSIGNMENT";
      payload: {
        volunteerId: string;
        elderlyName: string;
        date: string;
        shift: CellShift;
      };
    }
  | { type: "REMOVE_ASSIGNMENT"; payload: string }
  | {
      type: "MOVE_ASSIGNMENT";
      payload: {
        assignmentId: string;
        newVolunteerId: string;
        newDate: string;
        newShift: CellShift;
      };
    }
  | { type: "SET_CURRENT_WEEK"; payload: string }
  | { type: "LOAD_STATE"; payload: AppState };

export const SHIFT_LABEL: Record<CellShift, string> = {
  morning: "上午",
  afternoon: "下午",
};

export const SHIFT_FULL_LABEL: Record<Shift, string> = {
  morning: "上午",
  afternoon: "下午",
  all: "全天",
};

export const CONFLICT_LABEL: Record<ConflictType, string> = {
  VOLUNTEER_DOUBLE_SHIFT: "志愿者同时段重复",
  ELDERLY_DOUBLE_BOOKED: "老人同日重复登记",
  VOLUNTEER_OVER_CAPACITY: "志愿者陪诊人数超上限",
};

export const OUT_OF_BOUNDS_LABEL: Record<OutOfBoundsReason, string> = {
  DATE_UNAVAILABLE: "超出可服务日期",
  SHIFT_UNAVAILABLE: "超出可服务时段",
  OVER_CAPACITY: "超出陪诊上限",
};

export const WEEKDAY_LABEL = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
