# @perma/map

Hash Array Map Trie (HAMT) implementation based on [CHAMP][] paper and inspired by [Clojure][]. Library provides a builder API inspired by clojure [transient][]s that can be utilized for bulk updates.

## Status

Prototype implements hash-array map tries (HAMT) by synthesizing [CHAMP][]
algorithm with HAMTs used by [IPFS UnixFS][] and [IPLD HAMT][]. [CHAMP][]
algorithm utilized several optimizations that are incompatible with [IPFS UnixFS][] and [IPLD HAMT][], this implementation attempts to utilize those optimizations at
runtime and provide a way to map it to [IPFS UnixFS][] compatible representation.

## Optimizations

[CHAMP][] algorithm exploits branching factor of `32` because it can be manipulated efficiently on 32-bit processors. It also allows storing HAMT bitmaps in a single integer.

In order to support [IPFS UnixFS][] implementation (which uses `256` factor by default) branching factor is configurable, but relevant optimizations only apply when branching factor of `32` is used.

It is also worth noting that even with branching factor of `32` it can store large amount of entries in a relatively shallow tree e.g. tree 6 levels deep could store around `33,554,432` entries.

## Credits

- [Leveling up Clojure’s Hash Maps](https://bendyworks.com/blog/leveling-clojures-hash-maps)
- [Hash Array Mapped Tries](https://worace.works/2016/05/24/hash-array-mapped-tries/)
- [Optimizing Hash-Array Mapped Tries for Fast and Lean Immutable JVM Collections](https://michael.steindorfer.name/publications/oopsla15.pdf)
- [Lean Hash Array Mapped Trie (Lean Map)](https://github.com/bendyworks/lean-map)
- [Ideal hash trees](http://lampwww.epfl.ch/papers/idealhashtrees.pdf)

[ipfs unixfs]: https://github.com/ipfs/specs/blob/main/UNIXFS.md
[champ]: https://michael.steindorfer.name/publications/oopsla15.pdf
[ipld hamt]: https://ipld.io/specs/advanced-data-layouts/hamt/spec/
[clojure]: https://clojure.org/
[transient]: https://clojure.org/reference/transients
