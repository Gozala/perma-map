import * as Uint32BitField from "./Uint32.js"
import * as Uint8ArrayBitField from "./Uint8Array.js"

/**
 * @param {{bitWidth: number}} options
 */
export const configure = ({ bitWidth }) =>
  bitWidth === 5 ? Uint32BitField : Uint8ArrayBitField
