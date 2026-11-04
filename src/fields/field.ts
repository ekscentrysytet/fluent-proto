import type { $ZodType } from 'zod/v4/core'

type Optional = {
  implicit?: boolean
}

type RequiredMarker = { __required: true }

export abstract class Field<
  V = unknown,
  S extends $ZodType = $ZodType,
  Required extends boolean = false,
  Repeated extends boolean = false,
> {
  public isReserved: boolean = false
  public isRequired: Required = false as Required
  public n!: number
  public schema!: S
  public isRepeated: Repeated = false as Repeated
  protected optionalP: Optional = { implicit: false }
  private readonly OPTIONAL_KEYWORD = 'optional'
  private readonly REPEATED_KEYWORD = 'repeated'

  constructor(protected typeLiteral?: V) {}

  optional(o?: Optional): this {
    if (o) {
      this.optionalP = o
    }

    return this
  }

  idx(n: number): this {
    this.n = n

    return this
  }

  reserved(): this {
    this.isReserved = true

    return this
  }

  validate<Ret extends $ZodType>(
    fn: (s: S & { required(): S & RequiredMarker }) => Ret,
  ): Field<V, Ret, Ret extends RequiredMarker ? true : Required, Repeated> {
    const self = this
    const wrappedSchema = Object.assign(Object.create(this.schema), {
      required: () => {
        ;(self as { isRequired: boolean }).isRequired = true
        return self.schema
      },
    }) as S & { required(): S & RequiredMarker }

    // Apply the validation and update the schema
    const result = fn(wrappedSchema)
    // Update schema with the result (e.g., .max(), .min(), .default(), etc.)
    ;(this as { schema: $ZodType }).schema = result

    return this as unknown as Field<
      V,
      Ret,
      Ret extends RequiredMarker ? true : Required,
      Repeated
    >
  }

  /**
   * Serialize to a proto field line (without the trailing `;`).
   * `omitLabel` drops the `optional`/`repeated` label, which protobuf
   * forbids on members of a `oneof`.
   */
  serialize(key: string, options?: { omitLabel?: boolean }): string {
    const repeatedOrOptional = options?.omitLabel
      ? ''
      : this.isRepeated
        ? this.REPEATED_KEYWORD
        : !this.optionalP.implicit
          ? this.OPTIONAL_KEYWORD
          : ''

    return [repeatedOrOptional, this.typeLiteral, key, '=', this.n]
      .filter(Boolean)
      .join(' ')
  }
}
