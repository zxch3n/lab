import { LazyArray } from "./lazy-array.ts";
import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

Deno.test("LazyArray Factory", () => {
  const factory = LazyArray.createFactory((n: number, self) =>
    LazyArray.concat([n], self(n + 1))
  ) as (n: number) => LazyArray<number>;

  const arr = LazyArray.take(factory(0), 6);
  assertEquals(arr, [0, 1, 2, 3, 4, 5]);
});

Deno.test("LazyArray Factory 2", () => {
  const factory = LazyArray.createFactory((n: number, self) =>
    LazyArray.concat([1, 2, 3], self(n))
  ) as (n: number) => LazyArray<number>;

  const arr = LazyArray.take(factory(0), 6);
  assertEquals(arr, [1, 2, 3, 1, 2, 3]);
});

Deno.test("LazyArray From Iterable", () => {
  const input = [0, 1, 2, 3];
  const array = new LazyArray(input);
  assertEquals(Array.from(array), input);
});

Deno.test("LazyArray Factory Long", () => {
  const factory = LazyArray.createFactory((n: number, self) =>
    LazyArray.concat([1], self(n))
  ) as (n: number) => LazyArray<number>;

  const length = 1e4;
  const arr = LazyArray.take(factory(0), length);
  assertEquals(arr.length, length);
});
