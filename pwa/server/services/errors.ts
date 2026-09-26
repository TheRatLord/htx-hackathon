/** An error with a rider-friendly message and an HTTP status. */
export class ApiError extends Error {
  constructor(
    public status: 400 | 404 | 502 | 503,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
