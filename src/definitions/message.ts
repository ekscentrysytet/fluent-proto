import type { Field } from '../fields/field.js'
import type {
  MessageSchema,
  MessageOrOneofSchema,
  Serializable,
} from '../types.js'
import { OneofField } from '../fields/oneof.js'
import { indent, isPureOneofSchema, hasMixedOneofFields } from '../utils.js'

export type MessageOptions = {
  reserved?: number[]
}

export class MessageDefinition implements Serializable {
  private readonly MESSAGE_KEYWORD = 'message'
  private reservedKeys: number[] = []
  private readonly isPureOneof: boolean
  private readonly isMixed: boolean

  constructor(
    private readonly messageName: string,
    private readonly messageSchema: MessageOrOneofSchema,
    options?: MessageOptions,
  ) {
    this.isPureOneof = isPureOneofSchema(messageSchema)
    this.isMixed = hasMixedOneofFields(messageSchema)
    if (options) {
      this.parseOptions(options)
    }
  }

  private parseOptions(options: MessageOptions) {
    if (options.reserved) {
      this.reservedKeys = options.reserved
    }
  }

  private serializeReserved(fields: [string, Field][]): string {
    if (this.isPureOneof) return '' // Reserved not supported with pure oneof

    const idxs = new Set([
      ...this.reservedKeys,
      ...fields.map(([, field]) => field.n),
    ])

    if (!idxs.size) return ''

    return indent(
      `reserved ${Array.from(idxs)
        .sort((a, b) => a - b)
        .join(', ')};`,
    )
  }

  private serializePresent(fields: [string, Field][]): string {
    return fields
      .map(([key, field]) => indent(`${field.serialize(key)};`))
      .join('\n')
  }

  private serializeOneof(): string {
    const oneofEntries = Object.entries(this.messageSchema).filter(
      ([, value]) => value instanceof OneofField,
    ) as [string, OneofField<MessageSchema>][]

    return oneofEntries
      .map(([key, oneofField]) =>
        oneofField
          .serialize(key)
          .split('\n')
          .map((line) => indent(line))
          .join('\n'),
      )
      .join('\n')
  }

  private serializeKeys(): string {
    if (this.isPureOneof) {
      return ['{', this.serializeOneof(), '}'].join('\n')
    }

    // Handle both pure message schema and mixed schema
    const regularFields = Object.entries(this.messageSchema).filter(
      ([, value]) => !(value instanceof OneofField),
    ) as [string, Field][]

    const reservedFields = regularFields.filter(([, field]) => field.isReserved)
    const presentFields = regularFields.filter(([, field]) => !field.isReserved)

    const parts = [
      '{',
      this.serializeReserved(reservedFields),
      this.serializePresent(presentFields),
    ]

    // Add oneof fields if mixed
    if (this.isMixed) {
      parts.push(this.serializeOneof())
    }

    parts.push('}')

    return parts.filter(Boolean).join('\n')
  }

  serialize(): string {
    return [this.MESSAGE_KEYWORD, this.messageName, this.serializeKeys()].join(
      ' ',
    )
  }
}
