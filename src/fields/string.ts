import * as z from 'zod'
import { Field } from './field.js'

export class StringField<Repeated extends boolean = false> extends Field<
  'string',
  z.ZodString,
  false,
  Repeated
> {
  constructor() {
    super('string')

    this.schema = z.string()
  }

  repeated(): StringField<true> {
    ;(this as { isRepeated: boolean }).isRepeated = true

    return this as unknown as StringField<true>
  }
}

export const string = () => new StringField()
