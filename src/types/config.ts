export interface Config {
  npmUsername: string;
  timeZone: string;
  concurrency: number;
  maxRetries: number;
  pageSize: number;
  exclude: string[];
}
