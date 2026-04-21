"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { X } from "@phosphor-icons/react";

interface AttendeeTagInputProps {
  value: string[];
  onChange: (attendees: string[]) => void;
  suggestions?: string[];
  maxAttendees?: number;
}

export function AttendeeTagInput({
  value,
  onChange,
  suggestions = [],
  maxAttendees = 20,
}: AttendeeTagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = suggestions.filter(
    (s) =>
      inputValue.length > 0 &&
      s.toLowerCase().includes(inputValue.toLowerCase()) &&
      !value.includes(s)
  );

  const addAttendee = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || value.includes(trimmed) || value.length >= maxAttendees)
      return;
    onChange([...value, trimmed]);
    setInputValue("");
    setShowSuggestions(false);
  };

  const removeAttendee = (name: string) => {
    onChange(value.filter((a) => a !== name));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addAttendee(inputValue);
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeAttendee(value[value.length - 1]);
    }
  };

  return (
    <div className="relative">
      <div
        className="flex flex-wrap gap-1.5 min-h-[38px] rounded-lg border border-slate-200 bg-white p-2 cursor-text focus-within:ring-2 focus-within:ring-blue-600/20 focus-within:border-blue-600"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((attendee) => (
          <span
            key={attendee}
            className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 rounded-full px-2 py-0.5 text-xs font-medium"
          >
            {attendee}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeAttendee(attendee);
              }}
              className="text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X size={10} weight="regular" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={
            value.length === 0
              ? "이름 입력 후 Enter 또는 쉼표로 추가"
              : undefined
          }
          disabled={value.length >= maxAttendees}
          className="flex-1 min-w-[120px] text-xs outline-none bg-transparent text-slate-900 placeholder:text-slate-400 disabled:cursor-not-allowed"
        />
      </div>

      {/* Autocomplete suggestions */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-md overflow-hidden">
          {filteredSuggestions.slice(0, 8).map((suggestion) => (
            <li key={suggestion}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                onMouseDown={(e) => {
                  e.preventDefault();
                  addAttendee(suggestion);
                }}
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}

      {value.length >= maxAttendees && (
        <p className="text-xs text-slate-400 mt-1">
          최대 {maxAttendees}명까지 추가할 수 있습니다.
        </p>
      )}
    </div>
  );
}
