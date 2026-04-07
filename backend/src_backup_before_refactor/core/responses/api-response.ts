export type ApiSuccessResponse<T = unknown> = {
  ok: true;
  message: string;
  data?: T;
};

export type ApiErrorResponse = {
  ok: false;
  message: string;
  errors?: unknown;
};

export const successResponse = <T>(
  message: string,
  data?: T
): ApiSuccessResponse<T> => ({
  ok: true,
  message,
  data,
});

export const errorResponse = (
  message: string,
  errors?: unknown
): ApiErrorResponse => ({
  ok: false,
  message,
  errors,
});