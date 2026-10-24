export {
  isNonEmptyArray,
  isNonEmptyString,
  nonEmptyArray,
  nonEmptyString,
} from './non-empty.js'
export type { NonEmptyArray, NonEmptyString } from './non-empty.js'
export {
  bounded,
  finiteNumber,
  isFiniteNumber,
  isNegative,
  isNonZero,
  isPositive,
  negative,
  nonZero,
  positive,
} from './numeric.js'
export type {
  Bounded,
  FiniteNumber,
  Negative,
  NonZero,
  Positive,
} from './numeric.js'

type RangeFactory = (start: number, end: number) => Iterable<number>

function createRange(
  start: number,
  end: number,
  includeStart: boolean,
  includeEnd: boolean
): Iterable<number> {
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) {
    throw new RangeError('range endpoints must be safe integers')
  }

  return {
    *[Symbol.iterator]() {
      let value = includeStart ? start : start + 1

      while (value < end || (includeEnd && value === end)) {
        yield value
        if (value === end) {
          return
        }
        value++
      }
    },
  }
}

export const range: {
  closed: RangeFactory
  open: RangeFactory
  closedOpen: RangeFactory
  openClosed: RangeFactory
} = {
  closed: (start, end) => createRange(start, end, true, true),
  open: (start, end) => createRange(start, end, false, false),
  closedOpen: (start, end) => createRange(start, end, true, false),
  openClosed: (start, end) => createRange(start, end, false, true),
}
