import { useEffect, useState } from "react";
import { X, UserRoundPlus } from "lucide-react";
import type { CellShift } from "@/types";
import { SHIFT_LABEL } from "@/types";
import { useScheduleStore } from "@/store/useScheduleStore";
import { parseDate } from "@/utils/dateUtils";

interface Props {
  open: boolean;
  onClose: () => void;
  volunteerId: string;
  volunteerName: string;
  date: string;
  shift: CellShift;
}

export default function AddElderlyModal({
  open,
  onClose,
  volunteerId,
  volunteerName,
  date,
  shift,
}: Props) {
  const dispatch = useScheduleStore((s) => s.dispatch);
  const elderlyList = useScheduleStore((s) => s.elderlyList);

  const [elderlyName, setElderlyName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setElderlyName("");
      setError("");
    }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = elderlyName.trim();
    if (trimmed.length === 0) {
      setError("请输入老人姓名");
      return;
    }
    if (trimmed.length > 10) {
      setError("姓名过长，请输入10字以内");
      return;
    }

    dispatch({
      type: "ADD_ASSIGNMENT",
      payload: {
        volunteerId,
        elderlyName: trimmed,
        date,
        shift,
      },
    });

    onClose();
  };

  const selectExisting = (name: string) => {
    setElderlyName(name);
  };

  if (!open) return null;

  const d = parseDate(date);
  const dateDisplay = `${d.getMonth() + 1}月${d.getDate()}日 ${SHIFT_LABEL[shift]}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in">
        <div className="bg-medical-blue px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <UserRoundPlus className="w-6 h-6" />
            <div>
              <h3 className="text-lg font-bold">分配老人陪诊</h3>
              <p className="text-sm opacity-90">
                {volunteerName} · {dateDisplay}
              </p>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              👴 老人姓名
            </label>
            <input
              type="text"
              value={elderlyName}
              onChange={(e) => {
                setElderlyName(e.target.value);
                if (error) setError("");
              }}
              placeholder="请输入老人姓名"
              className={`input-field ${error ? "border-red-400 focus:border-red-400 focus:ring-red-100" : ""}`}
              autoFocus
              maxLength={10}
            />
            {error && <p className="text-sm text-red-500 mt-1.5">{error}</p>}
          </div>

          {elderlyList.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                💡 快速选择（已有老人）
              </label>
              <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto scrollbar-thin p-2 bg-gray-50 rounded-lg border border-gray-100">
                {elderlyList.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => selectExisting(e.name)}
                    className={`
                      px-3 py-1.5 rounded-full text-sm border-2 transition-all duration-150
                      ${elderlyName === e.name
                        ? "border-medical-blue bg-medical-blue-light text-medical-blue-dark font-medium"
                        : "border-gray-200 bg-white text-gray-600 hover:border-medical-blue/50 hover:text-medical-blue-dark"
                      }
                    `}
                    title={e.name}
                  >
                    {e.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              取消
            </button>
            <button type="submit" className="btn-primary flex-1">
              确认分配
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
