export type BreathPhase = 'Ready' | 'Inhale' | 'Hold' | 'Exhale' | 'Complete';

export interface BreathSettings {
  inhale: number;
  hold: number;
  exhale: number;
}
