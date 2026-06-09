import { create } from "zustand";
import type { Action, AppState, Assignment, Elderly, Volunteer } from "@/types";
import { generateId, getCurrentWeekMonday, getShortName } from "@/utils/dateUtils";

const initialState: AppState = {
  volunteers: [],
  elderlyList: [],
  assignments: [],
  currentWeekStart: getCurrentWeekMonday(),
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "ADD_VOLUNTEER": {
      const newVolunteer: Volunteer = {
        ...action.payload,
        id: generateId(),
      };
      return { ...state, volunteers: [...state.volunteers, newVolunteer] };
    }

    case "REMOVE_VOLUNTEER": {
      const filteredAssignments = state.assignments.filter(
        (a) => a.volunteerId !== action.payload,
      );
      const usedElderlyIds = new Set(filteredAssignments.map((a) => a.elderlyId));
      const filteredElderly = state.elderlyList.filter((e) => usedElderlyIds.has(e.id));
      return {
        ...state,
        volunteers: state.volunteers.filter((v) => v.id !== action.payload),
        assignments: filteredAssignments,
        elderlyList: filteredElderly,
      };
    }

    case "ADD_ELDERLY": {
      const existing = state.elderlyList.find(
        (e) => e.name.trim() === action.payload.name.trim(),
      );
      if (existing) return state;
      const newElderly: Elderly = {
        id: generateId(),
        name: action.payload.name.trim(),
        shortName: getShortName(action.payload.name),
      };
      return { ...state, elderlyList: [...state.elderlyList, newElderly] };
    }

    case "ADD_ASSIGNMENT": {
      let elderly = state.elderlyList.find(
        (e) => e.name.trim() === action.payload.elderlyName.trim(),
      );
      let newElderlyList = state.elderlyList;
      if (!elderly) {
        elderly = {
          id: generateId(),
          name: action.payload.elderlyName.trim(),
          shortName: getShortName(action.payload.elderlyName),
        };
        newElderlyList = [...state.elderlyList, elderly];
      }
      const { elderlyName, ...rest } = action.payload;
      const newAssignment: Assignment = {
        ...rest,
        id: generateId(),
        elderlyId: elderly.id,
      };
      return {
        ...state,
        elderlyList: newElderlyList,
        assignments: [...state.assignments, newAssignment],
      };
    }

    case "REMOVE_ASSIGNMENT": {
      const remaining = state.assignments.filter((a) => a.id !== action.payload);
      const usedElderlyIds = new Set(remaining.map((a) => a.elderlyId));
      const filteredElderly = state.elderlyList.filter((e) => usedElderlyIds.has(e.id));
      return {
        ...state,
        assignments: remaining,
        elderlyList: filteredElderly,
      };
    }

    case "MOVE_ASSIGNMENT": {
      return {
        ...state,
        assignments: state.assignments.map((a) =>
          a.id === action.payload.assignmentId
            ? {
                ...a,
                volunteerId: action.payload.newVolunteerId,
                date: action.payload.newDate,
                shift: action.payload.newShift,
              }
            : a,
        ),
      };
    }

    case "SET_CURRENT_WEEK":
      return { ...state, currentWeekStart: action.payload };

    case "LOAD_STATE":
      return action.payload;

    default:
      return state;
  }
}

export const useScheduleStore = create<AppState & { dispatch: (action: Action) => void }>(
  (set) => ({
    ...initialState,
    dispatch: (action) => set((state) => reducer(state, action)),
  }),
);
