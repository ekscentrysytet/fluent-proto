import * as z from 'zod'
import { Field } from './field.js'

export type ProtoDoubleTypes = 'double' | 'float'

export class FloatField<
  T extends ProtoDoubleTypes = ProtoDoubleTypes,
  Repeated extends boolean = false,
> extends Field<
  T,
  T extends 'float' ? z.ZodFloat32 : z.ZodFloat64,
  false,
  Repeated
> {
  public schema: T extends 'float' ? z.ZodFloat32 : z.ZodFloat64

  constructor(typeLiteral: T) {
    super(typeLiteral)

    this.schema = (
      typeLiteral === 'float' ? z.float32() : z.float64()
    ) as T extends 'float' ? z.ZodFloat32 : z.ZodFloat64
  }

  repeated(): FloatField<T, true> {
    ;(this as { isRepeated: boolean }).isRepeated = true

    return this as unknown as FloatField<T, true>
  }
}

export const float = <T extends ProtoDoubleTypes>(typeLiteral: T) =>
  new FloatField(typeLiteral)
