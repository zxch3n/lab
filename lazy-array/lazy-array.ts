const INSIDE_SYMBOL = Symbol();
export class LazyArray<T> {
  static createFactory<TArg, T>(
    callback: (arg: TArg, fn: (arg: TArg) => Generator<T>) => Generator<T>
  ): (args: TArg) => LazyArray<T> {
    type InsidePayload = { symbol: typeof INSIDE_SYMBOL; arg: TArg };
    let isInside = false;

    function* self(arg: TArg): Generator<T> {
      if (isInside) {
        yield (({
          symbol: INSIDE_SYMBOL,
          arg,
        } as InsidePayload) as unknown) as T;
      }

      isInside = true;
      const stack: Generator<T>[] = [callback(arg, self)];
      try {
        while (stack.length) {
          const top = stack[stack.length - 1];
          const { value, done } = top.next();
          if (done) {
            stack.pop();
            continue;
          }

          if (
            typeof value === "object" &&
            (value as InsidePayload).symbol === INSIDE_SYMBOL
          ) {
            stack.push(callback((value as InsidePayload).arg, self));
            continue;
          }

          yield value;
        }
      } finally {
        isInside = false;
      }
    }

    return (arg: TArg) => {
      return new LazyArray(self(arg));
    };
  }

  static take<T>(iterable: Iterable<T>, num: number): T[] {
    const iterator = iterable[Symbol.iterator]();
    const arr: T[] = [];
    for (let i = 0; i < num; i++) {
      const { done, value } = iterator.next();
      if (done) break;
      arr.push(value);
    }

    return arr;
  }

  private done = false;
  private cache: T[] = [];
  private iter?: Iterator<T>;
  private generatorCreator?: () => Iterator<T>;

  constructor(input: Generator<T> | Iterable<T> | (() => Iterator<T>)) {
    if ((input as Generator<T>).next) {
      this.iter = input as Generator<T>;
    } else if ((input as Iterable<T>)[Symbol.iterator]) {
      this.iter = (input as Iterable<T>)[Symbol.iterator]();
    } else {
      this.generatorCreator = input as () => Iterator<T>;
    }
  }

  private next() {
    if (!this.iter) {
      this.iter = this.generatorCreator!();
    }

    const res = this.iter.next();
    if (res.done) {
      this.done = true;
      return;
    }

    this.cache.push(res.value);
    return res.value;
  }

  length() {
    if (this.done) {
      return this.cache.length;
    }

    while (!this.done) {
      this.next();
    }

    return this.cache.length;
  }

  get(i: number): T {
    while (!this.done && this.cache.length <= i) {
      this.next();
    }

    return this.cache[i];
  }

  *[Symbol.iterator]() {
    for (let i = 0; ; i++) {
      this.get(i);
      if (this.done && i >= this.length()) {
        return;
      }

      yield this.get(i);
    }
  }

  static *concat<T>(...arr: Iterable<T>[]) {
    for (const iter of arr) {
      for (const v of iter) {
        yield v;
      }
    }
  }
}
