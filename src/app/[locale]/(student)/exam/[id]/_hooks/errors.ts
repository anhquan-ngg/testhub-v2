import { isAxiosError } from "axios";

/**
 * Extracts the backend `reason` code (e.g. "EXAM_CLOSED") from an error response,
 * checking both `data.reason` and `data.data.reason`.
 */
export function getErrorReason(error: unknown): unknown {
  const data: unknown = isAxiosError<unknown>(error)
    ? error.response?.data
    : undefined;
  const detail =
    typeof data === "object" && data !== null && "data" in data
      ? data.data
      : undefined;

  return (
    (typeof data === "object" && data !== null && "reason" in data
      ? data.reason
      : undefined) ??
    (typeof detail === "object" && detail !== null && "reason" in detail
      ? detail.reason
      : undefined)
  );
}
