// Re-export field builder factory for internal use
export {
  createFieldBuilder,
  createOneofBuilder,
  type FieldBuilder,
  type MessageCallbackContext,
} from './field-builder.js'

// Re-export field classes for instanceof checks
export { StringField } from './string.js'
export { IntField } from './int.js'
export { FloatField } from './float.js'
export { BoolField } from './bool.js'
export { BytesField } from './bytes.js'
export {
  MapField,
  type ProtoMapKeyTypes,
  type ProtoMapPrimitiveValueTypes,
} from './map.js'
export { RefField } from './ref.js'
export { OneofField } from './oneof.js'
