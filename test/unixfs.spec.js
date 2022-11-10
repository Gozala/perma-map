import { assert, test } from "./test.js"
import * as UnixFS from "../src/unixfs.js"
import { iterate } from "./util.js"

/**
 *
 * @param {UnixFS.PersistentHashMap} hamt
 * @returns
 */
const inspect = hamt => ({
  bitfield: [...UnixFS.bitField(hamt)].join(" "),
  links: [...UnixFS.iterate(hamt)].map(node => node.label).join(" "),
})
test.only("hamt basic", () => {
  const dir = UnixFS.from([["b", { content: "file" }]])

  assert.deepEqual(inspect(dir), {
    bitfield: "4 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
    links: "7Ab",
  })
})

test.only("hamt 10 children", () => {
  const dir = UnixFS.from(iterate(10))

  assert.deepEqual(inspect(dir), {
    bitfield:
      "32 64 2 0 16 0 0 0 0 0 0 0 0 0 0 8 0 2 0 0 0 0 2 0 0 2 4 0 0 0 32 0",
    links: "0D5 2A0 318 492 711 836 DC7 E99 F64 FD3",
  })
})

test.only("hamt 100 children", () => {
  const dir = UnixFS.from(iterate(100))

  assert.deepEqual(inspect(dir), {
    bitfield:
      "48 96 166 53 16 10 67 146 12 193 140 44 80 32 172 72 52 38 164 16 32 132 182 110 18 242 28 100 64 128 165 80",
    links:
      "0469 0630 0882 0A72 0D5 0F57 1776 1E 22 25 2674 2A0 2B28 2C14 318 3451 3562 3670 3744 3973 3C86 4184 4231 4320 45 4683 49 4A12 4C23 4D24 4F33 5295 5738 5D 6477 6A88 6D80 6F11 711 72 7566 7A41 7C54 7D27 836 8690 8A46 8B55 8D81 8F16 9594 9C64 9E67 A258 A332 A540 AA26 AB43 AF39 B059 B642 B779 BA47 BB19 C113 C448 C787 C893 C949 CE75 D1 D321 DC7 E017 E299 E468 E589 E9 EA53 ED EF65 F5 F64 FC85 FD",
  })
})

it.only("10 txt files", () => {
  const node = UnixFS.from(iterate(10, n => `${n}.txt`))
  assert.deepEqual(inspect(node), {
    bitfield: "1 0 0 0 8 16 0 0 0 8 1 0 0 16 0 8 0 0 0 0 0 0 2 0 0 0 144",
    links:
      "042.txt 071.txt 218.txt 5B9.txt 6C4.txt 807.txt 8B0.txt AC6.txt B33.txt D05.txt",
  })
})

it.only("100 txt files", () => {
  const node = UnixFS.from(iterate(100, n => `${n}.txt`))
  assert.deepEqual(inspect(node), {
    bitfield:
      "82 1 37 72 2 33 64 232 200 105 180 68 221 226 168 225 232 168 148 8 27 40 12 213 128 16 70 71 0 32 11 208",
    links:
      "042.txt 0689.txt 071.txt 0871.txt 0926.txt 0B51.txt 1510.txt 2046.txt 218.txt 2266.txt 2629.txt 2945.txt 2A 2E21.txt 3432.txt 3F78.txt 4068.txt 4230.txt 4440.txt 4674.txt 4714.txt 4A39.txt 4B28.txt 5393.txt 5520.txt 5860.txt 5925.txt 5B9.txt 5C47.txt 6350.txt 6A76.txt 6C4.txt 6F 7342.txt 7513.txt 7737.txt 7B54.txt 7D72.txt 7E73.txt 7F 807.txt 8577.txt 8649.txt 8782.txt 8B0.txt 8D48.txt 8F 9156.txt 9541.txt 9694.txt 9762.txt 9852.txt 9A15.txt 9B33.txt 9C 9E97.txt 9F69.txt A290.txt A6 AA86.txt AC6.txt AD87.txt AF95.txt B031.txt B33.txt B5 B681.txt BB22.txt BE64.txt BF43.txt C383.txt C5 C670.txt C719.txt CE67.txt D0 D538.txt D9 E384.txt E657.txt E899.txt EA23.txt ED91.txt F016.txt F917.txt FC FE79.txt",
  })
})

test.only("hamt 1000 children", () => {
  const node = UnixFS.from(iterate(1000))

  assert.deepEqual(inspect(node), {
    bitfield:
      "255 255 255 255 255 255 255 255 253 255 255 127 255 247 255 255 247 247 255 255 255 223 255 255 255 255 255 255 255 255 255 255",
    links:
      "00 01 02 03 04 05 06 07 08 09 0A 0B 0C273 0D 0E 0F 10 11 12 13 14 15 16 17 18 19 1A 1B 1C 1D 1E 1F 20 21 22 23 24 25 26 27 28 29 2A 2B 2C 2D 2E 2F 30 31 32876 33 34 35 36 3744 38 39 3A498 3B 3C 3D 3E 3F 40 41 42 43 44 45 46 47 48 49 4A 4B 4C 4D 4E 4F 50 51 52 53 54 56 57 58 59 5A 5B 5C217 5D 5E 5F 60 61 62 63 64 65 66381 67 68 69 6A 6B 6C 6D 6E 6F 70 71 72 74 75 76 77 78 79 7A 7C 7D 7E 7F 80 81 82 836 84 85 86 87 88 89 8A 8B 8C 8D 8E 8F 90 91 92 94 95 96 97 98 99 9A 9B 9C 9D 9E 9F A0 A1702 A2 A3 A4 A5 A6 A8 A9 AA AB AC AD AE AF B0 B1 B2 B3 B4 B5 B6 B7 B8 BA BB BC BD BE BF C0 C1 C2 C3 C4 C5 C6 C7 C8 C9 CA CB746 CC CD CE CF D0 D1 D2 D3 D4 D5805 D6875 D7 D8 D9 DA DB DC DD192 DE DF E0 E1 E299 E3 E4 E5 E6 E7 E8 E9 EA EB EC ED EE EF F0 F1 F2 F3 F4337 F5 F6 F7 F8 F9 FA FB FC FD FE FF",
  })
})

test.only("hamt 4000 children", () => {
  const node = UnixFS.from(iterate(4000))

  assert.deepEqual(inspect(node), {
    bitfield:
      "255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255",
    links:
      "00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F 10 11 12 13 14 15 16 17 18 19 1A 1B 1C 1D 1E 1F 20 21 22 23 24 25 26 27 28 29 2A 2B 2C 2D 2E 2F 30 31 32 33 34 35 36 37 38 39 3A 3B 3C 3D 3E 3F 40 41 42 43 44 45 46 47 48 49 4A 4B 4C 4D 4E 4F 50 51 52 53 54 55 56 57 58 59 5A 5B 5C 5D 5E 5F 60 61 62 63 64 65 66 67 68 69 6A 6B 6C 6D 6E 6F 70 71 72 73 74 75 76 77 78 79 7A 7B 7C 7D 7E 7F 80 81 82 83 84 85 86 87 88 89 8A 8B 8C 8D 8E 8F 90 91 92 93 94 95 96 97 98 99 9A 9B 9C 9D 9E 9F A0 A1 A2 A3 A4 A5 A6 A7 A8 A9 AA AB AC AD AE AF B0 B1 B2 B3 B4 B5 B6 B7 B8 B9 BA BB BC BD BE BF C0 C1 C2 C3 C4 C5 C6 C7 C8 C9 CA CB CC CD CE CF D0 D1 D2 D3 D4 D5 D6 D7 D8 D9 DA DB DC DD DE DF E0 E1 E2 E3 E4 E5 E6 E7 E8 E9 EA EB EC ED EE EF F0 F1 F2 F3 F4 F5 F6 F7 F8 F9 FA FB FC FD FE FF",
  })
})
