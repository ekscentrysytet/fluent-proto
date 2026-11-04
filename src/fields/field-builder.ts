import { string, type StringField } from './string.js'
import { int, type IntField, type ProtoIntTypes } from './int.js'
import { float, type FloatField, type ProtoDoubleTypes } from './float.js'
import { bool, type BoolField } from './bool.js'
import {
  MapField,
  type ProtoMapKeyTypes,
  type ProtoMapPrimitiveValueTypes,
} from './map.js'
import { RefField } from './ref.js'
import { OneofField } from './oneof.js'
import { bytes, BytesField } from './bytes.js'
import type { MessageSchema } from '../types.js'

/**
 * Typed field builder interface with ref constrained to valid reference names
 */
export interface FieldBuilder<RefNames extends string> {
  string: () => StringField
  int: <T extends ProtoIntTypes>(typeLiteral: T) => IntField<T>
  float: <T extends ProtoDoubleTypes>(typeLiteral: T) => FloatField<T>
  bool: () => BoolField
  map: <
    K extends ProtoMapKeyTypes,
    V extends ProtoMapPrimitiveValueTypes | RefNames,
  >(
    keyType: K,
    valueType: V,
  ) => MapField<K, V>
  ref: <T extends RefNames>(typeLiteral: T) => RefField<T>
  bytes: () => BytesField
}

/**
 * Factory function to create a typed field builder
 * RefNames constrains which reference names are valid for f.ref()
 */
export function createFieldBuilder<
  RefNames extends string,
>(): FieldBuilder<RefNames> {
  return {
    string,
    int,
    float,
    bool,
    map: <K extends ProtoMapKeyTypes, V extends string>(
      keyType: K,
      valueType: V,
    ) => new MapField(keyType, valueType),
    ref: <T extends RefNames>(typeLiteral: T) => new RefField(typeLiteral),
    bytes,
  }
}

/**
 * Creates a oneof field group.
 * A message with oneof should have exactly one oneof field (no regular fields mixed in).
 */
export function createOneofBuilder<RefNames extends string>(): <
  S extends MessageSchema,
>(
  schema: S,
) => OneofField<S> {
  return <S extends MessageSchema>(schema: S) => new OneofField(schema)
}

/**
 * Context passed to message definition callback
 * Includes field builder and oneof helper
 */
export type MessageCallbackContext<RefNames extends string> = {
  f: FieldBuilder<RefNames>
  oneof: <S extends MessageSchema>(schema: S) => OneofField<S>
}
