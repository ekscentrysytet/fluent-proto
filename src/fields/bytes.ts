import * as z from 'zod'
import { Field } from './field.js'

export class BytesField<Repeated extends boolean = false> extends Field<
  'bytes',
  z.ZodUnknown,
  false,
  Repeated
> {
  constructor() {
    super('bytes')

    this.schema = z.unknown()
  }

  repeated(): BytesField<true> {
    ;(this as { isRepeated: boolean }).isRepeated = true

    return this as unknown as BytesField<true>
  }
}

export const bytes = () => new BytesField()
