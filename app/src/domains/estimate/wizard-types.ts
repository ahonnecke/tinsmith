import type { WizardAnswers } from "./types";

export interface WizardOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

export interface BaseQuestion {
  id: string;
  title: string;
  description?: string;
  isVisible: (answers: WizardAnswers) => boolean;
}

export interface SelectQuestion<T extends string> extends BaseQuestion {
  type: "select";
  options: WizardOption<T>[];
  getValue: (answers: WizardAnswers) => T | null;
  setValue: (answers: WizardAnswers, value: T) => WizardAnswers;
}

export interface NumberQuestion extends BaseQuestion {
  type: "number";
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  placeholder?: string;
  getValue: (answers: WizardAnswers) => number | null;
  setValue: (answers: WizardAnswers, value: number) => WizardAnswers;
}

export interface CheckboxQuestion extends BaseQuestion {
  type: "checkbox";
  getValue: (answers: WizardAnswers) => boolean;
  setValue: (answers: WizardAnswers, value: boolean) => WizardAnswers;
}

export type WizardQuestion =
  | SelectQuestion<string>
  | NumberQuestion
  | CheckboxQuestion;

export interface WizardStep {
  id: string;
  title: string;
  icon: string;
  questions: WizardQuestion[];
}
