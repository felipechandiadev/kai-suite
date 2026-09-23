import { create } from "zustand";
import type { AppSection } from "@/config/routes";

type SectionState = {
  active: AppSection;
  setActive: (section: AppSection) => void;
};

export const useSectionStore = create<SectionState>((set) => ({
  active: "pos",
  setActive: (active) => set({ active }),
}));
