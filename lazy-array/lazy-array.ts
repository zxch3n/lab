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

    let gen: Generator<T>;

    const stack: Generator<T>[] = [];

    function* push(arg: TArg) {
      const payload = callback(arg, push as any);
      stack.push(payload);
    }

    function* self(arg: TArg): Generator<T> {
      stack.push(callback(arg, push as any));
      while (stack.length) {
        const index = stack.length - 1;
        const top = stack[index];
        const { value, done } = top.next();
        if (done) {
          stack.splice(index, 1);
          continue;
        }

        yield value;
      }
    }

    return (arg: TArg) => {
      created = true;
      gen = self(arg);
      return new LazyArray(gen);
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

  static *map<T, TReturn>(func: (arg: T) => TReturn, iter: Iterable<T>) {
    for (const v of iter) {
      yield func(v);
    }
  }
}
