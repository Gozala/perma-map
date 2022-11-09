import * as Uint8 from "./Uint8Array.js"
import * as Uint32 from "./Uint32.js"
import * as API from "./api.js"

/**
 *
 * @param {API.Uint32} size
 * @returns {API.BitField<Uint8Array>|API.BitField<API.Uint32>}
 */
export const configure = (size = 32) => {
  if (size === 32) {
    return Uint32
  } else {
    return Uint8.configure(size)
  }
}

export { API }
