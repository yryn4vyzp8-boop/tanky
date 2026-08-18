export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const Errors = {
  unauthorized: (message = "Unauthorized") => new HttpError(401, "UNAUTHORIZED", message),
  forbidden: (message = "Forbidden") => new HttpError(403, "FORBIDDEN", message),
  notFound: (message = "Not found") => new HttpError(404, "NOT_FOUND", message),
  badRequest: (message: string) => new HttpError(400, "BAD_REQUEST", message),
  conflict: (message: string) => new HttpError(409, "CONFLICT", message),
  unprocessable: (message: string) => new HttpError(422, "UNPROCESSABLE", message),
};
