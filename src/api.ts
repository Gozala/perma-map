import type { BitField, Uint32 } from "./bitfield/api.js"
import type { Path } from "./path/api.js"

export interface Config<Bits = unknown, BitMap = Bits> {
  /**
   * Number of bits of the hash to use for child index calculation at each level
   * of the tree such that the root node takes the first `bitWidth` bits of the
   * hash to calculate an index and as we move lower in the tree, we move along
   * the hash by `depth x bitWidth` bits. This also determines branching factor
   * of the tree beacuse each node will contain index for `2 ** bitWidth`
   * children.
   *
   * When omitted `bitWidth` of `5` is used which results in trees with branching
   * factor of 32, allowing us to use various space and computation optimizations
   * while still fitting large amounts of entries in relatively shallow tree (
   * around `33,554,432` entries in a tree that is just 6 levels deep)
   */
  bitWidth: Uint32

  /**
   * Configuration used by the HAMT to calculate tree path from the key. It used
   * for building an index and traversal. It can be configured so that e.g 32
   * branching factor is used in which case it will be highly optimized.
   */
  Path: Path<Bits>

  /**
   * Configuration used by the HAMT to represent child index (datamap & nodemap),
   * which is configurable allowing us to highly optimizing 32 barnch factor by
   * representing them as a single 32 bit integer as opposed to `Uint8Array`.
   */
  BitField: BitField<BitMap>
}

export interface HAMT<
  T = unknown,
  K extends string = string,
  C extends Config = Config
> {
  readonly root: BitmapIndexedNode<T, K, C>
  readonly config: C
}

export interface PersistentHashMap<
  T = unknown,
  K extends string = string,
  C extends Config = Config
> extends HAMT<T, K, C> {
  readonly size: number

  entries(): IterableIterator<[K, T]>
  keys(): IterableIterator<K>
  values(): IterableIterator<T>
  [Symbol.iterator](): IterableIterator<[K, T]>

  clone(): PersistentHashMap<T, K, C>
  empty(): PersistentHashMap<T, K, C>
  has(key: K): boolean
  get(key: K): T | undefined
  set<R extends string>(key: R, value: T): PersistentHashMap<T, K | R, C>
  delete(key: K): PersistentHashMap<T, K, C>

  createBuilder(): HashMapBuilder<T, K, C>
}

export interface HashMapBuilder<
  T = unknown,
  K extends string = string,
  C extends Config = Config
> extends HAMT<T, K, C> {
  readonly size: number

  set<R extends string>(key: R, value: T): HashMapBuilder<T, K | R, C>
  delete(key: K): HashMapBuilder<T, K, C>

  build(): PersistentHashMap<T, K, C>
}

export interface Node<
  T = unknown,
  K extends string = string,
  C extends Config = Config
> {
  edit: Edit | null
  children: Children<T, K, C>

  config: C

  lookup<X>(
    shift: Uint32,
    path: ReturnType<C["Path"]["from"]>,
    key: K,
    notFound: X
  ): T | X
  associate<R extends string>(
    edit: Edit | null,
    depth: Uint32,
    path: ReturnType<C["Path"]["from"]>,
    key: K | R,
    value: T,
    leafAdded: { value: boolean }
  ): Node<T, K | R, C>
  dissociate(
    edit: Edit | null,
    depth: Uint32,
    path: ReturnType<C["Path"]["from"]>,
    key: K,
    removedLeaf: { value: boolean }
  ): Node<T, K, C>

  entries(): IterableIterator<[K, T]>
  keys(): IterableIterator<K>
  values(): IterableIterator<T>

  fork(edit?: Edit | null): Node<T, K, C>

  nodeArity: number
  dataArity: number
}

export interface BitmapIndexedNode<
  T = unknown,
  K extends string = string,
  C extends Config = Config
> extends Node<T, K, C> {
  datamap: ReturnType<C["BitField"]["empty"]>
  nodemap: ReturnType<C["BitField"]["empty"]>

  associate<R extends string>(
    edit: Edit | null,
    depth: Uint32,
    path: ReturnType<C["Path"]["from"]>,
    key: K | R,
    value: T,
    leafAdded: { value: boolean }
  ): BitmapIndexedNode<T, K | R, C>
  dissociate(
    edit: Edit | null,
    depth: Uint32,
    path: ReturnType<C["Path"]["from"]>,
    key: K,
    removedLeaf: { value: boolean }
  ): BitmapIndexedNode<T, K, C>

  fork(edit?: Edit | null): BitmapIndexedNode<T, K, C>
}

export interface HashCollisionNode<
  T extends unknown = unknown,
  K extends string = string,
  C extends Config = Config
> extends Node<T, K, C> {
  config: C
  count: number
  children: CollisionEntries<T, K>
  nodeArity: 0

  fork(edit?: Edit | null): HashCollisionNode<T, K, C>
}

export type CollisionEntries<T, K> =
  | [K, T]
  | [K, T, K, T]
  | [K, T, K, T, K, T, ...Array<K | T>]

export interface Children<
  T = unknown,
  K extends string = string,
  C extends Config = Config
> extends Array<K | T | Node<T, K, C>> {}

export type usize = number

export interface Edit {}

export type { BitField, Uint32, Path }
