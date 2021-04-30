const directed = Symbol();
export class LazyArray<T> {
  static createFactory<TArg, T>(
    callback: (arg: TArg, fn: (arg: TArg) => Generator<T>) => Generator<T>
  ): (args: TArg) => LazyArray<T> {
    let created = false;
    if (created) {
      throw new Error(
        "Factory can only be used once. You should create another factory."
      );
    }

    const stack: Generator<T>[] = [];
    const set = new Set();

    function* push(
      arg: TArg
    ): Generator<T, unknown, undefined | typeof directed> {
      const payload = callback(arg, push);
      const { value, done } = payload.next(directed);
      if (done) {
        return;
      }

      const yielded = yield value;
      if (directed === yielded) {
        set.add(payload);
        stack.push(payload);
        return;
      }

      while (true) {
        const { value, done } = payload.next(directed);
        if (done) {
          return;
        }

        yield value;
      }
    }

    function* self(arg: TArg): Generator<T> {
      stack.push(callback(arg, push));
      while (stack.length) {
        const last = stack.length - 1;
        const payload = stack[last];
        const top = payload;
        const { value, done } = top.next(directed);
        if (done) {
          stack.splice(stack.indexOf(payload), 1);
          continue;
        }

        yield value;
      }
    }

    return (arg: TArg) => {
      created = true;
      const gen = self(arg);
      return new LazyArray(gen);
    };
  }

  static take<T>(iterable: Iterable<T>, num: number): T[] {
    const iterator = iterable[Symbol.iterator]();
    const arr: T[] = [];
    for (let i = 0; i < num; i++) {
      const { done, value } = iterator.next(directed as any);
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

    const res = this.iter.next(directed as any);
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
      const gen = iter[Symbol.iterator]();
      while (true) {
        const { value, done } = gen.next(directed as any);
        if (done) {
          break;
        }

        yield value;
      }
    }
  }

  static *map<T, TReturn>(func: (arg: T) => TReturn, iter: Iterable<T>) {
    for (const v of iter) {
      yield func(v);
    }
  }
}
