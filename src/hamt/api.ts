export type { Config } from "../hash.js"

export interface HAMT<T> {
  root: T
}

export interface Node<T = unknown, K extends string = string> {
  // bitfield: BitField
  // bitWidth: Uint32
  // padding_len: usize
  // pointers: T[]
  children: Children<T, K>

  lookup<X>(shift: Uint32, hash: Uint8Array, key: K, notFound: X): T | X
  associate<R extends string>(
    edit: Edit | null,
    shift: Uint32,
    hash: Uint8Array,
    key: K | R,
    value: T,
    leafAdded: { value: boolean }
  ): Node<T, K | R>
  dissociate(
    edit: Edit | null,
    shift: Uint32,
    hash: Uint8Array,
    key: K,
    removedLeaf: { value: boolean }
  ): Node<T, K>

  entries(): IterableIterator<[K, T]>
  keys(): IterableIterator<K>
  values(): IterableIterator<T>

  nodeArity: number
  dataArity: number

  fork(edit?: Edit): Node<T, K>
  empty(): Node<T, K>
}

export interface Children<T = unknown, K extends string = string>
  extends Array<K | T | Node<T, K>> {}

export type Uint32 = number
export type usize = number

export interface Edit {}
