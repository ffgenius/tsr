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

  flatMap<U extends Iterable<unknown>>(
    mapper: (value: T) => U
  ): Iter<U extends Iterable<infer V> ? V : never>
  flatMap(mapper: (value: T) => Iterable<unknown>): Iter<unknown> {
    const source = this
    let inner: Iter<unknown> | undefined

    return new Iter<unknown>(
      () => {
        while (true) {
          if (inner !== undefined) {
            const result = inner.next()
            if (!result.done) {
              return result
            }
            inner = undefined
          }

          const result = source.next()
          if (result.done) {
            return { done: true, value: undefined }
          }
          inner = Iter.from(mapper(result.value))
        }
      },
      () => {
        try {
          inner?.return()
        } catch (error) {
          try {
            source.return()
          } catch {
            // 内层清理失败时仍关闭外层，并保留内层的清理异常。
          }
          throw error
        }
        source.return()
      }
    )
  }

  flatten<U extends Iterable<unknown>>(
    this: Iter<U>
  ): Iter<U extends Iterable<infer V> ? V : never>
  flatten(this: Iter<Iterable<unknown>>): Iter<unknown> {
    return this.flatMap((value) => value)
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

  filterMap<U>(mapper: (value: T) => Option<U>): Iter<U> {
    const source = this

    return new Iter<U>(
      () => {
        let result = source.next()

        while (!result.done) {
          const mapped = mapper(result.value)
          if (mapped.isSome()) {
            return { done: false, value: mapped.unwrap() }
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

  inspect(observer: (value: T) => void): Iter<T> {
    return this.map((value) => {
      observer(value)
      return value
    })
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

  skip(count: number): Iter<T> {
    if (!Number.isInteger(count) || count < 0) {
      throw new RangeError('Iter.skip() requires a non-negative integer')
    }

    const source = this
    let remaining = count

    return new Iter<T>(
      () => {
        while (remaining > 0) {
          const result = source.next()
          if (result.done) {
            remaining = 0
            return { done: true, value: undefined }
          }

          remaining--
        }

        return source.next()
      },
      () => {
        source.return()
      }
    )
  }

  enumerate(): Iter<[number, T]> {
    const source = this
    let index = 0

    return new Iter<[number, T]>(
      () => {
        const result = source.next()
        if (result.done) {
          return { done: true, value: undefined }
        }

        return { done: false, value: [index++, result.value] }
      },
      () => {
        source.return()
      }
    )
  }

  chain<U>(values: Iterable<U>): Iter<T | U> {
    const source = this
    const other = Iter.from(values)
    let sourceFinished = false

    return new Iter<T | U>(
      () => {
        if (!sourceFinished) {
          const result = source.next()
          if (!result.done) {
            return result
          }
          sourceFinished = true
        }
        return other.next()
      },
      () => {
        try {
          source.return()
        } catch (error) {
          try {
            other.return()
          } catch {
            // 两个源都需尝试关闭，保留先发生的清理异常。
          }
          throw error
        }
        other.return()
      }
    )
  }

  zip<U>(values: Iterable<U>): Iter<[T, U]> {
    const source = this
    const other = Iter.from(values)

    return new Iter<[T, U]>(
      () => {
        const left = source.next()
        if (left.done) {
          return { done: true, value: undefined }
        }

        const right = other.next()
        if (right.done) {
          return { done: true, value: undefined }
        }
        return { done: false, value: [left.value, right.value] }
      },
      () => {
        try {
          source.return()
        } catch (error) {
          try {
            other.return()
          } catch {
            // 两个源都需尝试关闭，保留先发生的清理异常。
          }
          throw error
        }
        other.return()
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

  fold<U>(initial: U, reducer: (accumulator: U, value: T) => U): U {
    let accumulator = initial

    for (const value of this) {
      accumulator = reducer(accumulator, value)
    }

    return accumulator
  }

  reduce(reducer: (accumulator: T, value: T) => T): Option<T> {
    const first = this.next()
    if (first.done) {
      return Option.none()
    }

    return Option.some(this.fold(first.value, reducer))
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
