import * as z from 'zod'
import { Field } from './field.js'

export class RefField<
  T extends string = string,
  Repeated extends boolean = false,
> extends Field<T, z.ZodString, false, Repeated> {
  public schema: z.ZodString
  public readonly refName: T

  constructor(typeLiteral: T) {
    super(typeLiteral)
    this.refName = typeLiteral
    this.schema = z.string()
  }

  repeated(): RefField<T, true> {
    ;(this as { isRepeated: boolean }).isRepeated = true

    return this as unknown as RefField<T, true>
  }
}

export const ref = <T extends string>(typeLiteral: T): RefField<T> =>
  new RefField(typeLiteral)
