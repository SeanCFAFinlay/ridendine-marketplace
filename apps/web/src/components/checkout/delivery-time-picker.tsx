'use client';

import { useState } from 'react';
import { Card } from '@ridendine/ui';
import { generateTimeSlots, getAvailableDates } from '@/lib/checkout/scheduling';

export interface DeliveryTimePickerProps {
  selected: string | null;
  onSelect: (value: string | null) => void;
}

function formatDayLabel(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  const diff = Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';

  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTimeSlot(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function isSameDayLocal(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function DateTabs({
  dates,
  activeDate,
  onSelect,
}: {
  dates: Date[];
  activeDate: Date;
  onSelect: (d: Date) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {dates.map((date) => {
        const isActive = isSameDayLocal(date, activeDate);
        return (
          <button
            key={date.toDateString()}
            type="button"
            onClick={() => onSelect(date)}
            className={`flex-shrink-0 rounded-lg border-2 px-3 py-2 text-sm transition-colors ${
              isActive
                ? 'border-primary bg-primarySoft font-medium text-primary'
                : 'border-border text-text hover:border-borderStrong'
            }`}
          >
            {formatDayLabel(date)}
          </button>
        );
      })}
    </div>
  );
}

function TimeSlotGrid({
  slots,
  selected,
  onSelect,
}: {
  slots: Date[];
  selected: string | null;
  onSelect: (iso: string) => void;
}) {
  if (slots.length === 0) {
    return (
      <p className="mt-3 text-sm text-textMuted">
        No available time slots for this date. Please choose another day.
      </p>
    );
  }

  return (
    <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
      {slots.map((slot) => {
        const iso = slot.toISOString();
        const isSelected = selected === iso;
        return (
          <button
            key={iso}
            type="button"
            onClick={() => onSelect(iso)}
            className={`rounded-lg border-2 py-2 text-center text-sm transition-colors ${
              isSelected
                ? 'border-primary bg-primarySoft font-medium text-primary'
                : 'border-border text-text hover:border-borderStrong'
            }`}
          >
            {formatTimeSlot(slot)}
          </button>
        );
      })}
    </div>
  );
}

export function DeliveryTimePicker({ selected, onSelect }: DeliveryTimePickerProps) {
  const dates = getAvailableDates();
  const [activeDate, setActiveDate] = useState<Date>(dates[0]!);
  const [showScheduler, setShowScheduler] = useState(selected !== null);

  const slots = generateTimeSlots(activeDate);
  const isAsap = selected === null;

  function handleAsap() {
    setShowScheduler(false);
    onSelect(null);
  }

  function handleScheduleToggle() {
    setShowScheduler(true);
    if (slots.length > 0 && selected === null) {
      onSelect(slots[0]!.toISOString());
    }
  }

  function handleSlotSelect(iso: string) {
    onSelect(iso);
  }

  return (
    <Card>
      <h2 className="font-semibold text-text">Delivery Time</h2>
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          data-testid="asap-btn"
          aria-pressed={isAsap}
          onClick={handleAsap}
          className={`flex-1 rounded-lg border-2 py-3 text-center text-sm font-medium transition-colors ${
            isAsap
              ? 'border-primary bg-primarySoft text-primary'
              : 'border-border text-text hover:border-borderStrong'
          }`}
        >
          ASAP
          <span className="block text-xs font-normal opacity-70">~30-45 min</span>
        </button>

        <button
          type="button"
          data-testid="schedule-btn"
          aria-pressed={!isAsap}
          onClick={handleScheduleToggle}
          className={`flex-1 rounded-lg border-2 py-3 text-center text-sm font-medium transition-colors ${
            !isAsap
              ? 'border-primary bg-primarySoft text-primary'
              : 'border-border text-text hover:border-borderStrong'
          }`}
        >
          Schedule for later
          <span className="block text-xs font-normal opacity-70">Choose a time</span>
        </button>
      </div>

      {showScheduler && (
        <div className="mt-4">
          <DateTabs dates={dates} activeDate={activeDate} onSelect={setActiveDate} />
          <TimeSlotGrid slots={slots} selected={selected} onSelect={handleSlotSelect} />
        </div>
      )}
    </Card>
  );
}
