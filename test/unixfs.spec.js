import { assert, test } from "./test.js"
import { from, inspect, Path } from "./unixfs.js"
import { iterate } from "./util.js"
import iterate10 from "./fixtures/0-10.js"
import iterate120 from "./fixtures/0-120.js"
import iterate10txt from "./fixtures/0-10txt.js"
import iterate100txt from "./fixtures/0-100txt.js"
import iterate1000 from "./fixtures/0-1000.js"
import iterate4000 from "./fixtures/0-4000.js"

test("empty dir", async () => {
  const dir = from([])

  assert.deepEqual(inspect(dir), { bitfield: [], links: [] })
})

test("hamt basic", () => {
  const dir = from([["b", { content: "file" }]])

  assert.deepEqual(inspect(dir), {
    bitfield: [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    links: [{ prefix: "7A", key: "b", value: { content: "file" } }],
  })
})

test("dir with 10 entries", () => {
  const dir = from(iterate(10))

  assert.deepEqual(inspect(dir), iterate10)
})

test("dir with 120 entries", async () => {
  const node = from(iterate(120))
  assert.deepEqual(inspect(node), iterate120)
})

test("dir with 10 txt files", () => {
  const node = from(iterate(10, n => `${n}.txt`))

  assert.deepEqual(inspect(node), iterate10txt)
})

test("dir with 100 txt files", () => {
  const node = from(iterate(100, n => `${n}.txt`))
  assert.deepEqual(inspect(node, 1), iterate100txt)
})

test("dir with 1000 entries", async function () {
  const node = from(iterate(1000))

  assert.deepEqual(inspect(node, 1), iterate1000)
})

test("dir with 4000 entries", () => {
  const node = from(iterate(4000))

  assert.deepEqual(inspect(node, 1), iterate4000)
})

// test.only("dir with 40k entries", () => {
//   const node = from(iterate(100), {
//     bitWidth: 8,
//     Path: Path.configure({ bitWidth: 32 }),
//   })
//   // const node = from(iterate(1000000))

//   assert.deepEqual(node.size, 1)
// })
