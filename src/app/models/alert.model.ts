export interface Alert {
  id?: string; // Optional for unique identification
  type: 'success' | 'danger' | 'info' | 'warning' | 'primary';
  message: string;
  timeout?: number; // Optional timeout for auto-dismissal
}
