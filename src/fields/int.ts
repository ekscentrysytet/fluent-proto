import * as z from 'zod'
import { Field } from './field.js'

export type ProtoIntTypes = 'int32' | 'int64' | 'uint32' | 'uint64'

type IntSchemaType<T extends ProtoIntTypes> = T extends 'int32'
  ? z.ZodInt32
  : T extends 'uint32'
    ? z.ZodUInt32
    : T extends 'int64'
      ? z.ZodBigIntFormat
      : T extends 'uint64'
        ? z.ZodBigIntFormat
        : never

export class IntField<
  T extends ProtoIntTypes = ProtoIntTypes,
  Repeated extends boolean = false,
> extends Field<T, IntSchemaType<T>, false, Repeated> {
  public schema: IntSchemaType<T>

  constructor(typeLiteral: T) {
    super(typeLiteral)

    const schemaMap: Record<ProtoIntTypes, z.ZodType> = {
      int32: z.int32(),
      uint32: z.uint32(),
      int64: z.int64(),
      uint64: z.uint64(),
    }

    this.schema = schemaMap[typeLiteral] as IntSchemaType<T>
  }

  repeated(): IntField<T, true> {
    ;(this as { isRepeated: boolean }).isRepeated = true

    return this as unknown as IntField<T, true>
  }
}

export const int = <T extends ProtoIntTypes>(typeLiteral: T) =>
  new IntField(typeLiteral)
