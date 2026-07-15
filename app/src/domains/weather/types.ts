export interface WeatherStation {
  name: string;
  id: string;
  elevation: string;
  lat: string;
  lon: string;
}

export interface DesignCondition {
  condition: string;
  db: number | null;
  wb: number | null;
  dp: number | null;
  hr: number | null;
  label: string;
}
