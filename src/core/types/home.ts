export interface HomeMetric {
  label: string;
  value: string;
  unit?: string;
}

export interface HomeServiceEntry {
  key: string;
  title: string;
  description: string;
  path: string;
  requireLogin?: boolean;
}

export interface HomeSummary {
  parkName: string;
  businessDate: string;
  notice: string;
  metrics: HomeMetric[];
  services: HomeServiceEntry[];
}
