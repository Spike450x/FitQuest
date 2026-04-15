"use client";

import { xpProgress } from "@/lib/gameLogic/xp";

interface XPBarProps {
  xp: number;
  level: number;
  xpToNextLevel: number;
}

export function XPBar({ xp, level, xpToNextLevel }: XPBarProps) {
  const progress = xpProgress(xp, level);
  const pct = Math.round(progress * 100);

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-indigo-600 mb-1 font-medium">
        <span>Level {level}</span>
        <span>
          {xp} / {xpToNextLevel} XP
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
