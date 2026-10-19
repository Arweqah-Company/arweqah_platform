export interface ApiErrorBody {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
}
