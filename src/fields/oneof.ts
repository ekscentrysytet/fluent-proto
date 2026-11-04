import type { MessageSchema } from '../types.js'
import { indent } from '../utils.js'
import { MapField } from './map.js'

/**
 * Represents a protobuf oneof field group.
 * Unlike regular fields, OneofField contains a schema of multiple fields
 * that represent mutually exclusive options.
 */
export class OneofField<S extends MessageSchema = MessageSchema> {
  // Marker to distinguish from regular fields at type level
  public readonly __isOneof = true as const

  constructor(public readonly schema: S) {}

  /**
   * Serialize to proto format, unindented (the enclosing message indents it):
   * oneof kind {
   *   string string_value = 1;
   *   double number_value = 2;
   * }
   *
   * Oneof members never carry a label: protobuf rejects
   * `optional`/`repeated`/`required` inside a oneof, and does not allow
   * repeated or map fields there at all.
   */
  serialize(oneofName: string): string {
    const fields = Object.entries(this.schema).map(([key, field]) => {
      if (field.isRepeated || field instanceof MapField) {
        throw new Error(
          `Field "${key}" in oneof "${oneofName}" is ${field.isRepeated ? 'repeated' : 'a map'}; ` +
            'protobuf does not allow repeated or map fields inside a oneof',
        )
      }
      return indent(`${field.serialize(key, { omitLabel: true })};`)
    })

    return [`oneof ${oneofName} {`, ...fields, '}'].join('\n')
  }
}
