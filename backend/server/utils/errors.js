export const createHttpError = (status, message) => {
  const error = new Error(message)
  error.status = status
  return error
}

export const asyncHandler = (handler) => async (request, response, next) => {
  try {
    await handler(request, response, next)
  } catch (error) {
    next(error)
  }
}
