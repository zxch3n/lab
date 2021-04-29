# Lazy Array

## Specifications

0. Array value evaluation are lazy
1. `LazyArray` will memorize the calculated values
2. Infinite list can be created by `LazyArray`
3. We can get the length of array by `LazyArray.length`
4. Array can be concatenated by `LazyArray.concat`
5. `LazyArray`'s definition can be recursive  
6. `*[Symbol.iterator]()`
7. Access element at target index
8. Immutable

## Usage

```ts
const factory = LazyArray.createFactory(
  (n, self) => [[n], self(n + 1)]
)

LazyArray.take(factory(0), 6) // OUTPUT: [0, 1, 2, 3, 4, 5]
```