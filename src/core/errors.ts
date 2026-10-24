export class OptionUnwrapError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OptionUnwrapError'
  }
}

export class ResultUnwrapError extends Error {
  readonly error: unknown

  constructor(message: string, error: unknown) {
    super(message, { cause: error })
    this.name = 'ResultUnwrapError'
    this.error = error
  }
}
