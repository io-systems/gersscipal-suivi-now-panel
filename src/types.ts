export interface GspTimeRange {
  start: string;
  end: string;
}

export interface DayValues {
  day: string;
  periods: GspTimeRange[];
  weekDay: number;
}

interface SetupValue {
  model: string[];
  week: DayValues[];
}

export interface Setup {
  key: string;
  value: SetupValue;
}

export interface ProductionOptions {
  dashboardTitle: string;
  refreshSeconds: number;
}
