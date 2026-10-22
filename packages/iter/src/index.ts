type IterResult<T> = IteratorResult<T, undefined>

export class Iter<T> implements IterableIterator<T> {
  private readonly nextValue: () => IterResult<T>
  private finished = false

  private constructor(nextValue: () => IterResult<T>) {
    this.nextValue = nextValue
  }

  static from<T>(values: Iterable<T>): Iter<T> {
    let source: Iterator<T> | undefined

    return new Iter(() => {
      if (source === undefined) {
        source = values[Symbol.iterator]()
      }

      return source.next()
    })
  }

  next(): IteratorResult<T> {
    if (this.finished) {
      return { done: true, value: undefined }
    }

    const result = this.nextValue()
    if (result.done) {
      this.finished = true
    }

    return result
  }

  [Symbol.iterator](): IterableIterator<T> {
    return this
  }

  map<U>(mapper: (value: T) => U): Iter<U> {
    const source = this

    return new Iter<U>(() => {
      const result = source.next()
      if (result.done) {
        return { done: true, value: undefined }
      }

      return { done: false, value: mapper(result.value) }
    })
  }

  filter<S extends T>(predicate: (value: T) => value is S): Iter<S>
  filter(predicate: (value: T) => boolean): Iter<T>
  filter<S extends T>(predicate: (value: T) => boolean): Iter<S> {
    const source = this

    return new Iter<S>(() => {
      let result = source.next()

      while (!result.done) {
        if (predicate(result.value)) {
          return { done: false, value: result.value as S }
        }

        result = source.next()
      }

      return { done: true, value: undefined }
    })
  }

  take(count: number): Iter<T> {
    if (!Number.isInteger(count) || count < 0) {
      throw new RangeError('Iter.take() requires a non-negative integer')
    }

    const source = this
    let remaining = count

    return new Iter<T>(() => {
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
    })
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
