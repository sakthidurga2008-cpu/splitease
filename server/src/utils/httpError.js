// An error that carries an HTTP status and a message that is safe to show.
export class HttpError extends Error {
  constructor(status, message, field) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

export const badRequest = (message, field) => new HttpError(400, message, field);
export const unauthorized = (message = 'Log in to continue.') => new HttpError(401, message);
export const forbidden = (message = 'You do not have access to this.') => new HttpError(403, message);
export const notFound = (message = 'Not found.') => new HttpError(404, message);
export const conflict = (message, field) => new HttpError(409, message, field);
