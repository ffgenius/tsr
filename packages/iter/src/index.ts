import { Option } from '@tsr/core'

type IterResult<T> = IteratorResult<T, undefined>

export class Iter<T> implements IterableIterator<T> {
  private readonly nextValue: () => IterResult<T>
  private readonly closeSource: () => void
  // take 达到上限后仍允许显式关闭源，因此分别记录结束与关闭状态。
  private finished = false
  private closed = false

  private constructor(nextValue: () => IterResult<T>, closeSource: () => void) {
    this.nextValue = nextValue
    this.closeSource = closeSource
  }

  static from<T>(values: Iterable<T>): Iter<T> {
    let source: Iterator<T> | undefined

    return new Iter(
      () => {
        if (source === undefined) {
          source = values[Symbol.iterator]()
        }

        return source.next()
      },
      () => {
        source?.return?.()
      }
    )
  }

  next(): IteratorResult<T> {
    if (this.finished) {
      return { done: true, value: undefined }
    }

    try {
      const result = this.nextValue()
      if (result.done) {
        this.finished = true
      }

      return result
    } catch (error) {
      try {
        this.return()
      } catch {
        // 清理失败时仍保留最初的迭代或回调异常。
      }

      throw error
    }
  }

  return(): IterResult<T> {
    this.finished = true
    if (!this.closed) {
      this.closed = true
      this.closeSource()
    }

    return { done: true, value: undefined }
  }

  [Symbol.iterator](): IterableIterator<T> {
    return this
  }

  map<U>(mapper: (value: T) => U): Iter<U> {
    const source = this

    return new Iter<U>(
      () => {
        const result = source.next()
        if (result.done) {
          return { done: true, value: undefined }
        }

        return { done: false, value: mapper(result.value) }
      },
      () => {
        source.return()
      }
    )
  }

  filter<S extends T>(predicate: (value: T) => value is S): Iter<S>
  filter(predicate: (value: T) => boolean): Iter<T>
  filter<S extends T>(predicate: (value: T) => boolean): Iter<S> {
    const source = this

    return new Iter<S>(
      () => {
        let result = source.next()

        while (!result.done) {
          if (predicate(result.value)) {
            return { done: false, value: result.value as S }
          }

          result = source.next()
        }

        return { done: true, value: undefined }
      },
      () => {
        source.return()
      }
    )
  }

  take(count: number): Iter<T> {
    if (!Number.isInteger(count) || count < 0) {
      throw new RangeError('Iter.take() requires a non-negative integer')
    }

    const source = this
    let remaining = count

    return new Iter<T>(
      () => {
        if (remaining === 0) {
          return { done: true, value: undefined }
        }

        const result = source.next()
        if (result.done) {
          remaining = 0
          return { done: true, value: undefined }
        }

        remaining--
        return { done: false, value: result.value }
      },
      () => {
        source.return()
      }
    )
  }

  find<S extends T>(predicate: (value: T) => value is S): Option<S>
  find(predicate: (value: T) => boolean): Option<T>
  find(predicate: (value: T) => boolean): Option<T> {
    const result = this.filter(predicate).next()
    return result.done ? Option.none() : Option.some(result.value)
  }

  any(predicate: (value: T) => boolean): boolean {
    return this.find(predicate).isSome()
  }

  all(predicate: (value: T) => boolean): boolean {
    return this.find((value) => !predicate(value)).isNone()
  }

  collect(): T[] {
    const values: T[] = []
    let result = this.next()

    while (!result.done) {
      values.push(result.value)
      result = this.next()
    }

    return values
  }
}
