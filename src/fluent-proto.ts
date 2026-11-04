import * as z from 'zod'
import { ImportDefinition } from './definitions/import.js'
import {
  MessageDefinition,
  type MessageOptions,
} from './definitions/message.js'
import { EnumDefinition } from './definitions/enum.js'
import { PackageDefinition } from './definitions/package.js'
import {
  ServiceDefinition,
  type ServiceMethods,
} from './definitions/service.js'
import { SyntaxDefinition, type SyntaxVersion } from './definitions/syntax.js'
import type { Field } from './fields/field.js'
import { RefField } from './fields/ref.js'
import { OneofField } from './fields/oneof.js'
import type {
  MessageSchema,
  EnumSchema,
  MessageOrOneofSchema,
  Serializable,
} from './types.js'
import { DEFINITIONS_TYPES } from './constants.js'

import { MapField, type ProtoMapKeyTypes } from './fields/map.js'
import {
  createFieldBuilder,
  createOneofBuilder,
  type MessageCallbackContext,
} from './fields/field-builder.js'
import {
  pascalCaseMessageName,
  isPureOneofSchema,
  hasMixedOneofFields,
  isEnumSchema,
} from './utils.js'

/**
 * Transforms a dotted string into PascalCase by capitalizing each segment.
 * Used to convert protobuf package-qualified names to valid TypeScript identifiers.
 *
 * @example
 * // Input: "google.protobuf.StringValue"
 * // Output: "GoogleProtobufStringValue"
 *
 * @example
 * // Input: "common.User"
 * // Output: "CommonUser"
 */
type PascalCase<S extends string> = S extends `${infer First}.${infer Rest}`
  ? `${Capitalize<First>}${PascalCase<Rest>}`
  : Capitalize<S>

/**
 * Remaps schema keys by prepending a package prefix. Used when importing schemas
 * from another proto definition to namespace them properly.
 *
 * @example
 * // Input: PrefixKeys<{ Response: {...}, User: {...} }, 'common'>
 * // Output: { 'common.Response': {...}, 'common.User': {...} }
 *
 * @example
 * // Empty prefix passes through unchanged:
 * // Input: PrefixKeys<{ Response: {...} }, ''>
 * // Output: { Response: {...} }
 */
type PrefixKeys<T extends AllSchemas, Prefix extends string> = {
  [K in keyof T as K extends string
    ? Prefix extends ''
      ? K
      : `${Prefix}.${K}`
    : never]: T[K]
}

type Definitions = {
  [DEFINITIONS_TYPES.SYNTAX]: SyntaxDefinition
  [DEFINITIONS_TYPES.PACKAGE]: PackageDefinition
  [DEFINITIONS_TYPES.IMPORT]: ImportDefinition[]
  [DEFINITIONS_TYPES.SERVICE]: ServiceDefinition
  [DEFINITIONS_TYPES.ENUM]: Map<string, EnumDefinition>
  [DEFINITIONS_TYPES.MESSAGE]: Map<string, MessageDefinition>
}

interface TypedMap<T> extends Map<keyof T, T[keyof T]> {
  set<K extends keyof T = keyof T>(key: K, value: T[K]): this
  get<K extends keyof T = keyof T>(key: K): T[K]
}

const createTypedMap = <T>() => new Map() as TypedMap<T>

// Schemas can be message schemas, oneof schemas, or enum schemas
export type AllSchemas = Record<
  string,
  MessageOrOneofSchema | EnumSchema | WithCustomSchema<z.ZodType>
>

// Wrapper type for custom schemas - allows type-level tracking
export type WithCustomSchema<Z extends z.ZodType> = {
  readonly __brand: 'custom_schema'
  readonly zodType: Z
}

// In Zod 4, ZodEnum takes Record<string, string> where key === value
type EnumEntries<E extends EnumSchema> = {
  [K in keyof E as K extends string ? K : never]: K extends string ? K : never
}

type InferEnumSchema<E extends EnumSchema> = z.ZodEnum<EnumEntries<E>>

/**
 * Resolves a field to its base Zod schema type (before repeated/array wrapping).
 * Handles three field categories with ref resolution in priority order:
 *
 * 1. **RefField** - Looks up referenced type by exact name, then PascalCase
 * 2. **MapField** - Creates ZodRecord, resolving value type if it's a ref
 * 3. **Field** - Extracts schema, handling map literals and ref type literals
 *
 * @example
 * // RefField pointing to an enum:
 * // Input: RefField<'Status', false>, { Status: { PENDING: 0 } }
 * // Output: z.ZodEnum<{ PENDING: 'PENDING' }>
 *
 * @example
 * // MapField with ref value:
 * // Input: MapField<'string', 'User'>, { User: { id: StringField } }
 * // Output: z.ZodRecord<z.ZodString, z.ZodObject<{ id: ... }>>
 */
type ResolveFieldBaseSchema<F, AllDefs extends AllSchemas> =
  F extends RefField<infer RefName, boolean>
    ? RefName extends keyof AllDefs
      ? InferSchemaWithRefs<AllDefs[RefName], AllDefs>
      : PascalCase<RefName> extends keyof AllDefs
        ? InferSchemaWithRefs<AllDefs[PascalCase<RefName>], AllDefs>
        : z.ZodUnknown
    : F extends MapField<ProtoMapKeyTypes, infer V>
      ? V extends keyof AllDefs
        ? z.ZodRecord<z.ZodString, InferSchemaWithRefs<AllDefs[V], AllDefs>>
        : PascalCase<V> extends keyof AllDefs
          ? z.ZodRecord<
              z.ZodString,
              InferSchemaWithRefs<AllDefs[PascalCase<V>], AllDefs>
            >
          : F extends { schema: infer S }
            ? S
            : z.ZodUnknown
      : F extends Field<infer TypeLiteral, infer S, any, any>
        ? // Check for map type literal (e.g., 'map<string, Example>')
          TypeLiteral extends `map<${string}, ${infer V}>`
          ? V extends keyof AllDefs
            ? z.ZodRecord<z.ZodString, InferSchemaWithRefs<AllDefs[V], AllDefs>>
            : PascalCase<V> extends keyof AllDefs
              ? z.ZodRecord<
                  z.ZodString,
                  InferSchemaWithRefs<AllDefs[PascalCase<V>], AllDefs>
                >
              : S
          : // Check if type literal is a ref name (for ref fields after .validate())
            TypeLiteral extends string
            ? TypeLiteral extends keyof AllDefs
              ? InferSchemaWithRefs<AllDefs[TypeLiteral], AllDefs>
              : PascalCase<TypeLiteral> extends keyof AllDefs
                ? InferSchemaWithRefs<AllDefs[PascalCase<TypeLiteral>], AllDefs>
                : S
            : S
        : F extends { schema: infer S }
          ? S
          : z.ZodUnknown

/**
 * Resolves a field's complete Zod schema, wrapping in ZodArray if repeated.
 * Delegates to ResolveFieldBaseSchema for the inner type resolution.
 *
 * @example
 * // Non-repeated string field:
 * // Input: StringField<false>, AllDefs
 * // Output: z.ZodString
 *
 * @example
 * // Repeated ref field:
 * // Input: RefField<'User', true>, { User: MessageSchema }
 * // Output: z.ZodArray<z.ZodObject<...>>
 */
type ResolveFieldSchema<F, AllDefs extends AllSchemas> = F extends {
  isRepeated: true
}
  ? z.ZodArray<ResolveFieldBaseSchema<F, AllDefs>>
  : ResolveFieldBaseSchema<F, AllDefs>

/**
 * Builds a ZodObject type from a MessageSchema. Maps each field to its resolved
 * Zod schema, applying optional+nullable wrappers for non-required fields.
 *
 * @example
 * // Input message: { id: StringField(required), name: StringField(optional) }
 * // Output: z.ZodObject<{
 * //   id: z.ZodString,
 * //   name: z.ZodNullable<z.ZodOptional<z.ZodString>>
 * // }>
 */
type InferMessageSchemaWithRefs<
  M extends MessageSchema,
  AllDefs extends AllSchemas,
> = z.ZodObject<{
  [K in keyof M]: M[K]['isRequired'] extends true
    ? ResolveFieldSchema<M[K], AllDefs>
    : z.ZodNullable<z.ZodOptional<ResolveFieldSchema<M[K], AllDefs>>>
}>

// For oneof, we create a union of strict objects, each with one optional field
// e.g., oneof { string_value, number_value } -> z.union([z.object({ string_value: ... }), z.object({ number_value: ... })])
type InferOneofSchemaWithRefs<
  O extends Record<string, OneofField<MessageSchema>>,
  AllDefs extends AllSchemas,
> =
  O[keyof O] extends OneofField<infer Fields>
    ? z.ZodUnion<OneofUnionTuple<Fields, AllDefs>>
    : never

/**
 * Converts a record of oneof fields into a tuple type for ZodUnion.
 * Uses distributive conditional pattern: maps fields → indexed access → infer union → tuple.
 *
 * @example
 * // Input: { strVal: StringField, intVal: Int32Field }
 * // Step 1 (mapped): { strVal: ZodObject<{strVal: ...}>, intVal: ZodObject<{intVal: ...}> }
 * // Step 2 (indexed): ZodObject<{strVal}> | ZodObject<{intVal}>
 * // Step 3 (tuple): [ZodObject<{strVal}>, ...ZodObject<{intVal}>[]]
 */
type OneofUnionTuple<
  Fields extends MessageSchema,
  AllDefs extends AllSchemas,
> = {
  [K in keyof Fields]: z.ZodObject<{
    [P in K]: z.ZodOptional<ResolveFieldSchema<Fields[K], AllDefs>>
  }>
}[keyof Fields] extends infer U
  ? U extends z.ZodType
    ? [U, ...U[]]
    : never
  : never

/**
 * Type predicate: returns `true` if ALL fields in schema are OneofField.
 * Used to distinguish pure oneof messages from regular or mixed messages.
 *
 * @example
 * // Pure oneof (all OneofField): IsPureOneofSchema<{ kind: OneofField<...> }> → true
 * // Mixed (has regular): IsPureOneofSchema<{ id: StringField, kind: OneofField }> → false
 */
type IsPureOneofSchema<S> =
  S extends Record<string, OneofField<MessageSchema>>
    ? S[keyof S] extends OneofField<MessageSchema>
      ? true
      : false
    : false

/**
 * Type predicate: returns `true` if schema contains at least one OneofField.
 * Uses Extract to check if any field value is assignable to OneofField.
 *
 * @example
 * // Has oneof: HasOneofFields<{ id: StringField, kind: OneofField }> → true
 * // No oneof: HasOneofFields<{ id: StringField, name: StringField }> → false
 */
type HasOneofFields<S> =
  S extends Record<string, unknown>
    ? Extract<S[keyof S], OneofField<MessageSchema>> extends never
      ? false
      : true
    : false

/**
 * Type predicate: returns `true` if schema contains at least one regular (non-oneof) field.
 * Uses Exclude to filter out OneofField and check if anything remains.
 *
 * @example
 * // Has regular: HasRegularFields<{ id: StringField, kind: OneofField }> → true
 * // Pure oneof: HasRegularFields<{ kind: OneofField }> → false
 */
type HasRegularFields<S> =
  S extends Record<string, unknown>
    ? Exclude<S[keyof S], OneofField<MessageSchema>> extends never
      ? false
      : true
    : false

/**
 * Type predicate: returns `true` if schema has BOTH oneof AND regular fields.
 * Mixed schemas require special handling to produce union of base + each variant.
 *
 * @example
 * // Mixed: IsMixedSchema<{ id: StringField, payload: OneofField }> → true
 * // Pure oneof: IsMixedSchema<{ kind: OneofField }> → false
 * // Regular: IsMixedSchema<{ id: StringField }> → false
 */
type IsMixedSchema<S> =
  HasOneofFields<S> extends true
    ? HasRegularFields<S> extends true
      ? true
      : false
    : false

// For mixed schemas, we return a union type
// Full type inference is complex, so we use a simplified representation
type InferMixedSchemaWithRefs<S, AllDefs extends AllSchemas> = z.ZodUnion<
  [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]
>

/**
 * Master dispatcher that routes a schema definition to the correct Zod type builder.
 * Checks schema kind in priority order and delegates to specialized inference types.
 *
 * Resolution order:
 * 1. **WithCustomSchema** → Extract the custom ZodType directly
 * 2. **Mixed schema** → InferMixedSchemaWithRefs (union of base + variants)
 * 3. **Pure oneof** → InferOneofSchemaWithRefs (union of single-field objects)
 * 4. **Message** → InferMessageSchemaWithRefs (ZodObject with fields)
 * 5. **Enum** → InferEnumSchema (ZodEnum)
 *
 * @example
 * // Custom schema: InferSchemaWithRefs<WithCustomSchema<z.ZodString>, _> → z.ZodString
 * // Enum: InferSchemaWithRefs<{ PENDING: 0, ACTIVE: 1 }, _> → z.ZodEnum<...>
 * // Message: InferSchemaWithRefs<{ id: StringField }, _> → z.ZodObject<{ id: ... }>
 */
type InferSchemaWithRefs<S, AllDefs extends AllSchemas> =
  S extends WithCustomSchema<infer Z>
    ? Z // Custom schema - use the ZodType directly
    : IsMixedSchema<S> extends true
      ? InferMixedSchemaWithRefs<S, AllDefs>
      : IsPureOneofSchema<S> extends true
        ? S extends Record<string, OneofField<MessageSchema>>
          ? InferOneofSchemaWithRefs<S, AllDefs>
          : never
        : S extends MessageSchema
          ? InferMessageSchemaWithRefs<S, AllDefs>
          : S extends EnumSchema
            ? InferEnumSchema<S>
            : never

type SchemasAccessor<T extends AllSchemas> = {
  [K in keyof T as K extends string ? PascalCase<K> : K]: InferSchemaWithRefs<
    T[K],
    T
  >
}

// Extended message options with optional custom schema
export type MessageOptionsWithSchema<Z extends z.ZodType = never> =
  MessageOptions & {
    schema?: (zod: typeof z) => Z
  }

// Type guard for custom schema wrapper (runtime check not needed since we use _customSchemas map)
const isCustomSchemaWrapper = (
  schema: MessageOrOneofSchema | EnumSchema | WithCustomSchema<z.ZodType>,
): schema is WithCustomSchema<z.ZodType> =>
  typeof schema === 'object' &&
  schema !== null &&
  '__brand' in schema &&
  schema.__brand === 'custom_schema'

// Helper to extract package prefix from a schema name (e.g., "common" from "common.FindByParams")
const getPackagePrefix = (schemaName: string): string | undefined => {
  const lastDotIndex = schemaName.lastIndexOf('.')
  return lastDotIndex > 0 ? schemaName.substring(0, lastDotIndex) : undefined
}

// Helper to resolve a reference name to a schema, trying both direct and prefixed lookups
const resolveRefToSchema = (
  refName: string,
  accessor: Record<string, z.ZodType>,
  packagePrefix?: string,
): z.ZodType | undefined => {
  // Try direct lookup first (handles fully-qualified refs like "common.SomeType")
  const pascalRef = pascalCaseMessageName(refName)
  const referencedSchema = accessor[pascalRef]
  if (referencedSchema) return referencedSchema

  // If not found and we have a package context, try with package prefix
  // This handles refs within imported packages that use local names
  if (packagePrefix) {
    const prefixedRef = pascalCaseMessageName(`${packagePrefix}.${refName}`)
    return accessor[prefixedRef]
  }

  return undefined
}

// Helper to resolve a field's schema, handling refs and repeated fields
// packagePrefix is used to resolve local refs within imported packages
const resolveFieldSchema = (
  field: Field<unknown, any, boolean, boolean>,
  accessor: Record<string, z.ZodType>,
  packagePrefix?: string,
): z.ZodType => {
  let baseSchema: z.ZodType

  if (field instanceof RefField) {
    const referencedSchema = resolveRefToSchema(
      field.refName,
      accessor,
      packagePrefix,
    )
    baseSchema = referencedSchema ?? z.unknown()
  } else if (field instanceof MapField) {
    const referencedSchema = resolveRefToSchema(
      field.valueType,
      accessor,
      packagePrefix,
    )
    baseSchema = referencedSchema
      ? z.record(z.string(), referencedSchema)
      : (field.schema as z.ZodType)
  } else {
    baseSchema = field.schema as z.ZodType
  }

  return field.isRepeated ? z.array(baseSchema) : baseSchema
}

// Build a mixed schema with regular fields + oneof variants
const buildMixedSchema = (
  schema: MessageOrOneofSchema,
  accessor: Record<string, z.ZodType>,
  packagePrefix?: string,
): z.ZodType | undefined => {
  const baseShape: Record<string, z.ZodType> = {}
  const oneofFields: Array<[string, OneofField<MessageSchema>]> = []

  for (const [fieldName, field] of Object.entries(schema)) {
    if (field instanceof OneofField) {
      oneofFields.push([fieldName, field])
    } else {
      const f = field as Field<unknown, any, boolean, boolean>
      const fieldSchema = resolveFieldSchema(f, accessor, packagePrefix)
      baseShape[fieldName] = f.isRequired
        ? fieldSchema
        : fieldSchema.optional().nullable()
    }
  }

  const unionMembers: z.ZodType[] = []
  for (const [, oneofField] of oneofFields) {
    for (const [variantName, variantField] of Object.entries(
      oneofField.schema,
    )) {
      const variantSchema = resolveFieldSchema(
        variantField as Field<unknown, any, boolean, boolean>,
        accessor,
        packagePrefix,
      )
      unionMembers.push(
        z
          .object({
            ...baseShape,
            [variantName]: variantSchema.optional().nullable(),
          })
          .strict(),
      )
    }
  }

  if (unionMembers.length >= 2) {
    return z.union(
      unionMembers as unknown as [z.ZodType, z.ZodType, ...z.ZodType[]],
    )
  }
  if (unionMembers.length === 1) {
    return unionMembers[0]
  }
  return undefined
}

// Build a pure oneof schema (all fields in oneof)
const buildPureOneofSchema = (
  schema: Record<string, OneofField<MessageSchema>>,
  accessor: Record<string, z.ZodType>,
  packagePrefix?: string,
): z.ZodType | undefined => {
  const oneofField = Object.values(schema)[0]
  if (!oneofField) return undefined

  const unionMembers = Object.entries(oneofField.schema).map(
    ([fieldName, field]) => {
      const fieldSchema = resolveFieldSchema(
        field as Field<unknown, any, boolean, boolean>,
        accessor,
        packagePrefix,
      )
      return z
        .object({
          [fieldName]: fieldSchema.optional().nullable(),
        })
        .strict()
    },
  )

  if (unionMembers.length >= 2) {
    return z.union(
      unionMembers as unknown as [z.ZodType, z.ZodType, ...z.ZodType[]],
    )
  }
  if (unionMembers.length === 1) {
    return unionMembers[0]
  }
  return undefined
}

// Build a regular message schema
const buildMessageSchema = (
  schema: MessageSchema,
  accessor: Record<string, z.ZodType>,
  packagePrefix?: string,
): z.ZodType => {
  const shape: Record<string, z.ZodType> = {}
  for (const [fieldName, field] of Object.entries(schema)) {
    const f = field as Field<unknown, any, boolean, boolean>
    const fieldSchema = resolveFieldSchema(f, accessor, packagePrefix)
    shape[fieldName] = f.isRequired
      ? fieldSchema
      : fieldSchema.optional().nullable()
  }
  const objectSchema = z.object(shape)
  return Object.keys(shape).length === 0 ? objectSchema.strict() : objectSchema
}

export class FluentProto<
  Schemas extends AllSchemas = {},
  PackageName extends string = '',
> {
  public readonly definitions: TypedMap<Definitions> =
    createTypedMap<Definitions>()
  // Note: Made public to allow schema merging in .import()
  public readonly _schemas: Schemas = {} as Schemas
  // Store custom Zod schemas for messages that define explicit schemas
  public readonly _customSchemas: Map<string, z.ZodType> = new Map()

  private _cachedSchemas: SchemasAccessor<Schemas> | null = null

  get schemas(): SchemasAccessor<Schemas> {
    if (this._cachedSchemas) return this._cachedSchemas

    const accessor = {} as Record<string, z.ZodType>

    // First pass: add custom schemas and enum schemas
    for (const [name, schema] of Object.entries(this._schemas)) {
      const pascalName = pascalCaseMessageName(name)

      const customSchema = this._customSchemas.get(name)
      if (customSchema) {
        accessor[pascalName] = customSchema
        continue
      }

      if (isCustomSchemaWrapper(schema)) continue

      if (isEnumSchema(schema)) {
        const enumKeys = Object.keys(schema) as [string, ...string[]]
        accessor[pascalName] = z.enum(enumKeys)
      }
    }

    // Second pass: build message schemas (which may reference enums or other messages)
    for (const [name, schema] of Object.entries(this._schemas)) {
      const pascalName = pascalCaseMessageName(name)
      if (accessor[pascalName]) continue
      if (isCustomSchemaWrapper(schema)) continue
      if (isEnumSchema(schema)) continue

      const packagePrefix = getPackagePrefix(name)

      if (hasMixedOneofFields(schema)) {
        const result = buildMixedSchema(schema, accessor, packagePrefix)
        if (result) accessor[pascalName] = result
      } else if (isPureOneofSchema(schema)) {
        const result = buildPureOneofSchema(schema, accessor, packagePrefix)
        if (result) accessor[pascalName] = result
      } else {
        accessor[pascalName] = buildMessageSchema(
          schema as MessageSchema,
          accessor,
          packagePrefix,
        )
      }
    }

    this._cachedSchemas = accessor as SchemasAccessor<Schemas>
    return this._cachedSchemas
  }

  syntax(val: SyntaxVersion): FluentProto<Schemas, PackageName> {
    this.definitions.set(DEFINITIONS_TYPES.SYNTAX, new SyntaxDefinition(val))

    return this
  }

  package<P extends string>(val: P): FluentProto<Schemas, P> {
    this.definitions.set(DEFINITIONS_TYPES.PACKAGE, new PackageDefinition(val))

    return this as unknown as FluentProto<Schemas, P>
  }

  import<I extends AllSchemas, P extends string>(
    protoFile: string,
    definition: FluentProto<I, P>,
  ): FluentProto<Schemas & PrefixKeys<I, P>, PackageName> {
    const existing = this.definitions.get(DEFINITIONS_TYPES.IMPORT) ?? []

    this.definitions.set(
      DEFINITIONS_TYPES.IMPORT,
      existing.concat(new ImportDefinition(protoFile)),
    )

    // Merge imported schemas with package prefix
    const importedPackage =
      definition.definitions.get(DEFINITIONS_TYPES.PACKAGE)?.val ?? ''
    for (const [name, schema] of Object.entries(definition._schemas)) {
      const prefixedName = importedPackage ? `${importedPackage}.${name}` : name
      ;(this._schemas as AllSchemas)[prefixedName] = schema
    }

    return this as unknown as FluentProto<
      Schemas & PrefixKeys<I, P>,
      PackageName
    >
  }

  enum<N extends string, D extends EnumSchema>(
    name: N,
    def: D,
  ): FluentProto<Schemas & { [K in N]: D }, PackageName> {
    const existing =
      this.definitions.get(DEFINITIONS_TYPES.ENUM) ??
      new Map<string, Serializable>()

    this.definitions.set(
      DEFINITIONS_TYPES.ENUM,
      existing.set(name, new EnumDefinition(name, def)),
    )
    ;(this._schemas as AllSchemas)[name] = def

    return this as unknown as FluentProto<
      Schemas & { [K in N]: D },
      PackageName
    >
  }

  message<
    N extends string,
    D extends MessageOrOneofSchema,
    Z extends z.ZodType = never,
  >(
    name: N,
    defCallback: (ctx: MessageCallbackContext<keyof Schemas & string>) => D,
    options?: MessageOptionsWithSchema<Z>,
  ): FluentProto<
    Schemas & { [K in N]: [Z] extends [never] ? D : WithCustomSchema<Z> },
    PackageName
  > {
    const existing =
      this.definitions.get(DEFINITIONS_TYPES.MESSAGE) ??
      new Map<string, Serializable>()

    // Create typed field builder and oneof helper, then invoke callback
    const f = createFieldBuilder<keyof Schemas & string>()
    const oneof = createOneofBuilder<keyof Schemas & string>()
    const def = defCallback({ f, oneof })

    // Extract only MessageOptions for the definition (exclude schema)
    const { schema: schemaFn, ...messageOptions } = options ?? {}
    const messageDefinition = new MessageDefinition(
      name,
      def,
      Object.keys(messageOptions).length > 0 ? messageOptions : undefined,
    )

    this.definitions.set(
      DEFINITIONS_TYPES.MESSAGE,
      existing.set(name, messageDefinition),
    )

    // Store custom schema if provided
    if (schemaFn) {
      this._customSchemas.set(name, schemaFn(z))
    }

    // Store field definitions for proto generation (regardless of custom schema)
    ;(this._schemas as AllSchemas)[name] = def

    return this as unknown as FluentProto<
      Schemas & { [K in N]: [Z] extends [never] ? D : WithCustomSchema<Z> },
      PackageName
    >
  }

  service<M extends ServiceMethods<keyof Schemas & string>>(
    name: string,
    serviceMethods: M,
  ): FluentProto<Schemas, PackageName> {
    const serviceDefinition = new ServiceDefinition(name, serviceMethods)

    this.definitions.set(DEFINITIONS_TYPES.SERVICE, serviceDefinition)

    return this as unknown as FluentProto<Schemas, PackageName>
  }
}

export const fluentProto = () => new FluentProto()
