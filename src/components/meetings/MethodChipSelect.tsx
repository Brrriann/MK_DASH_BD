"use client";

import type { MeetingMethod } from "@/lib/types";

const METHODS: { value: MeetingMethod; label: string }[] = [
  { value: "in_person", label: "대면" },
  { value: "video", label: "화상" },
  { value: "phone", label: "전화" },
  { value: "email", label: "이메일" },
];

interface MethodChipSelectProps {
  value: MeetingMethod | null;
  onChange: (method: MeetingMethod | null) => void;
}

export function MethodChipSelect({ value, onChange }: MethodChipSelectProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {METHODS.map((method) => {
        const isSelected = value === method.value;
        return (
          <button
            key={method.value}
            type="button"
            onClick={() => onChange(isSelected ? null : method.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              isSelected
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {method.label}
          </button>
        );
      })}
    </div>
  );
}
