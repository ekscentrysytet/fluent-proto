import { DEFINITIONS_TYPES } from './constants.js'
import { EnumDefinition } from './definitions/enum.js'
import { MessageDefinition } from './definitions/message.js'
import type { FluentProto } from './fluent-proto.js'
import type { Serializable } from './types.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const protoConverter = <D extends FluentProto<any>>(builder: D) => {
  const DEFINITIONS_ORDER = [
    DEFINITIONS_TYPES.SYNTAX,
    DEFINITIONS_TYPES.PACKAGE,
    DEFINITIONS_TYPES.IMPORT,
    DEFINITIONS_TYPES.SERVICE,
    DEFINITIONS_TYPES.ENUM,
    DEFINITIONS_TYPES.MESSAGE,
  ]
  const keys = Array.from(builder.definitions.keys())

  const ordered = DEFINITIONS_ORDER.filter((t) => keys.includes(t))

  return ordered
    .map((d) => {
      const def = builder.definitions.get(d)
      const isMapType =
        d === DEFINITIONS_TYPES.MESSAGE || d === DEFINITIONS_TYPES.ENUM

      if (isMapType) {
        const mapDef = def as Map<string, MessageDefinition | EnumDefinition>
        const items = Array.from(mapDef.values())

        return items.map((v) => v.serialize()).join('\n\n')
      }

      const casted = Array.isArray(def) ? def : [def]

      return casted.map((v) => (v as Serializable).serialize()).join('\n')
    })
    .join('\n\n')
}
