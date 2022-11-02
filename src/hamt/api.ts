import type { BitField } from "../bitfield/api.js"

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
   * Configuration used by the HAMT to calculate and consuming key hashes when
   * building an index. It can be configured so that e.g 32 branch factor can be
   * highly optimized.
   */
  hash: KeyHasher<Bits>

  /**
   * Configuration used by the HAMT to represent child index (datamap & nodemap),
   * which is configurable allowing us to highly optimizing 32 barnch factor by
   * representing them as a single 32 bit integer as opposed to `Uint8Array`.
   */
  bitfield: BitField<BitMap>
}

/**
 * An API is used to compute key hash and consume it in `bitWidth` number of
 * bits at a time. Interface is abstract to allow most efficient representation
 * of the hash, specifically this enables us to optimize HAMTs with branching
 * factor of 32 where key hash is just a 32 bits and there for will be a
 * represented as a single 32 bit integer. In other words `Self` is `number` in
 * optimized case and `Uint8Array` in all other cases.
 */
export interface KeyHasher<Self> {
  /**
   * Function is used to calculate a hash from the (UTF8 encoded) key. Please
   * note that hashing function is NOT REQUIRED to be cryptographically secure
   * since these hashes are not stored anywhere, in fact plain text keys are
   * stored instead. This is also why this function can and is required to be
   * synchronous in turn making HAMTs fit for use cases where async interface
   * would be prohibitive.
   */
  create(keyBytes: Uint8Array): Self

  /**
   * Size in bits of the hash hash this will produce
   */
  size: number

  /**
   * Function to read out `count` number of bits from the given bit `offset` of
   * the provided `keyHash` as single `Uint32`. It is used by HAMT implementation
   * to consume `bitWidth` number of bits of the hash at every depth level in
   * order to calculate the index.
   */
  slice(keyHash: Self, offset: number, count: number): Uint32
}

export interface HAMT<
  T = unknown,
  K extends string = string,
  C extends Config = Config
> {
  readonly root: BitmapIndexedNode<T, K, C>
  readonly config: C
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
    hash: ReturnType<C["hash"]["create"]>,
    key: K,
    notFound: X
  ): T | X
  associate<R extends string>(
    edit: Edit | null,
    shift: Uint32,
    hash: ReturnType<C["hash"]["create"]>,
    key: K | R,
    value: T,
    leafAdded: { value: boolean }
  ): Node<T, K | R>
  dissociate(
    edit: Edit | null,
    shift: Uint32,
    hash: ReturnType<C["hash"]["create"]>,
    key: K,
    removedLeaf: { value: boolean }
  ): Node<T, K, C>

  entries(): IterableIterator<[K, T]>
  keys(): IterableIterator<K>
  values(): IterableIterator<T>

  fork(edit?: Edit | null): this

  nodeArity: number
  dataArity: number
}

export interface BitmapIndexedNode<
  T = unknown,
  K extends string = string,
  C extends Config = Config
> extends Node<T, K, C> {
  datamap: ReturnType<C["bitfield"]["create"]>
  nodemap: ReturnType<C["bitfield"]["create"]>

  empty(): BitmapIndexedNode<T, K, C>
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

export type Uint32 = number
export type usize = number

export interface Edit {}

export type { BitField }
