import { create } from 'zustand';

interface CombatState {
  combatActive: boolean;
  setCombatActive: (active: boolean) => void;
  clear: () => void;
}

export const useCombatStore = create<CombatState>((set) => ({
  combatActive: false,
  setCombatActive: (active) => set({ combatActive: active }),
  clear: () => set({ combatActive: false }),
}));
