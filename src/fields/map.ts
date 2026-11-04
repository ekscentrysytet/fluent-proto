import * as z from 'zod'
import { Field } from './field.js'

// Proto map key types - only integral and string types allowed (no floats, bytes, or messages)
export type ProtoMapKeyTypes =
  | 'int32'
  | 'int64'
  | 'uint32'
  | 'uint64'
  | 'sint32'
  | 'sint64'
  | 'fixed32'
  | 'fixed64'
  | 'sfixed32'
  | 'sfixed64'
  | 'bool'
  | 'string'

// Proto primitive value types for maps
export type ProtoMapPrimitiveValueTypes =
  | 'int32'
  | 'int64'
  | 'uint32'
  | 'uint64'
  | 'sint32'
  | 'sint64'
  | 'fixed32'
  | 'fixed64'
  | 'sfixed32'
  | 'sfixed64'
  | 'bool'
  | 'string'
  | 'bytes'
  | 'float'
  | 'double'

// Map proto value type to Zod schema type
type ZodValueSchema<V extends string> = V extends 'string' | 'bytes'
  ? z.ZodString
  : V extends 'bool'
    ? z.ZodBoolean
    : V extends 'int64' | 'uint64' | 'sint64' | 'fixed64' | 'sfixed64'
      ? z.ZodBigInt
      : V extends 'float' | 'double'
        ? z.ZodNumber
        : V extends 'int32' | 'uint32' | 'sint32' | 'fixed32' | 'sfixed32'
          ? z.ZodNumber
          : z.ZodUnknown // Reference types - resolved at runtime

// Map schema type for the field
type MapSchema<V extends string> = z.ZodRecord<z.ZodString, ZodValueSchema<V>>

// Helper to create the key schema
const createKeySchema = (keyType: ProtoMapKeyTypes): z.ZodType => {
  switch (keyType) {
    case 'string':
      return z.string()
    case 'bool':
      return z.boolean()
    case 'int64':
    case 'uint64':
    case 'sint64':
    case 'fixed64':
    case 'sfixed64':
      return z.bigint()
    default:
      // int32, uint32, sint32, fixed32, sfixed32
      return z.number().int()
  }
}

// Helper to create the value schema for primitives
const createPrimitiveValueSchema = (
  valueType: ProtoMapPrimitiveValueTypes,
): z.ZodType => {
  switch (valueType) {
    case 'string':
    case 'bytes':
      return z.string()
    case 'bool':
      return z.boolean()
    case 'int64':
    case 'uint64':
    case 'sint64':
    case 'fixed64':
    case 'sfixed64':
      return z.bigint()
    case 'float':
    case 'double':
      return z.number()
    default:
      // int32, uint32, sint32, fixed32, sfixed32
      return z.number().int()
  }
}

// Check if a value is a primitive type
const isPrimitiveValueType = (v: string): v is ProtoMapPrimitiveValueTypes => {
  const primitives: string[] = [
    'int32',
    'int64',
    'uint32',
    'uint64',
    'sint32',
    'sint64',
    'fixed32',
    'fixed64',
    'sfixed32',
    'sfixed64',
    'bool',
    'string',
    'bytes',
    'float',
    'double',
  ]
  return primitives.includes(v)
}

export class MapField<
  K extends ProtoMapKeyTypes = ProtoMapKeyTypes,
  V extends string = string,
> extends Field<`map<${K}, ${V}>`, MapSchema<V>> {
  public schema: MapSchema<V>
  public readonly keyType: K
  public readonly valueType: V

  constructor(keyType: K, valueType: V) {
    super(`map<${keyType}, ${valueType}>`)
    this.keyType = keyType
    this.valueType = valueType

    // Create key schema
    const keySchema = createKeySchema(keyType)

    // Create value schema - use unknown as placeholder for refs (actual schema built at runtime)
    const valueSchema = isPrimitiveValueType(valueType)
      ? createPrimitiveValueSchema(valueType)
      : z.unknown() // Reference type - schema resolved at runtime

    this.schema = z.record(
      keySchema as z.ZodString,
      valueSchema,
    ) as MapSchema<V>
    this.optionalP = { implicit: true }
  }
}

// Overloaded map function for type safety
// 1. Primitive key, primitive value
export function map<
  K extends ProtoMapKeyTypes,
  V extends ProtoMapPrimitiveValueTypes,
>(keyType: K, valueType: V): MapField<K, V>

// 2. Primitive key, reference value (constrained by RefNames)
export function map<K extends ProtoMapKeyTypes, V extends string>(
  keyType: K,
  valueType: V,
): MapField<K, V>

// Implementation
export function map<K extends ProtoMapKeyTypes, V extends string>(
  keyType: K,
  valueType: V,
): MapField<K, V> {
  return new MapField(keyType, valueType)
}
