import * as z from 'zod'
import { Field } from './field.js'

export class BoolField<Repeated extends boolean = false> extends Field<
  'bool',
  z.ZodBoolean,
  false,
  Repeated
> {
  constructor() {
    super('bool')

    this.schema = z.boolean()
  }

  repeated(): BoolField<true> {
    ;(this as { isRepeated: boolean }).isRepeated = true

    return this as unknown as BoolField<true>
  }
}

export const bool = () => new BoolField()
