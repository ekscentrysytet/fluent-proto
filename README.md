# fluent-proto

Define Protocol Buffer schemas once, in TypeScript, and get everything else for free:

- **`.proto` files**, ready for `protoc`, `@grpc/proto-loader` or any gRPC tooling
- **Zod schemas** for runtime validation of every message and enum
- **TypeScript types** inferred straight from your definitions, with no codegen step

No more keeping a `.proto` file, hand-written interfaces and validation logic in sync. The builder is the single source of truth.

```bash
npm install fluent-proto
```

## Quick start

```ts
import { fluentProto, protoConverter, type Infer } from 'fluent-proto'

export const orders = fluentProto()
  .syntax('proto3')
  .package('shop.orders')
  .enum('OrderStatus', { PENDING: 0, PAID: 1, SHIPPED: 2 })
  .message('Item', ({ f }) => ({
    sku: f.string().idx(1).validate((s) => s.required()),
    quantity: f.int('int32').idx(2).validate((s) => s.min(1).default(1)),
  }))
  .message('Order', ({ f }) => ({
    id: f.string().idx(1).validate((s) => s.required()),
    status: f.ref('OrderStatus').idx(2),
    items: f.ref('Item').repeated().idx(3),
    tags: f.map('string', 'string').idx(4),
  }))
  .message('GetOrderRequest', ({ f }) => ({
    id: f.string().idx(1).validate((s) => s.required()),
  }))
  .service('OrderService', {
    getOrder: { request: 'GetOrderRequest', response: 'Order' },
  })
```

That single definition gives you all three outputs:

**1. A `.proto` file**

```ts
fs.writeFileSync('orders.proto', protoConverter(orders))
```

```proto
syntax = "proto3";

package shop.orders;

service OrderService {
  rpc getOrder (GetOrderRequest) returns (Order) {};
}

enum OrderStatus {
  PENDING = 0;
  PAID = 1;
  SHIPPED = 2;
}

message Item {
  optional string sku = 1;
  optional int32 quantity = 2;
}

message Order {
  optional string id = 1;
  optional OrderStatus status = 2;
  repeated Item items = 3;
  map<string, string> tags = 4;
}

message GetOrderRequest {
  optional string id = 1;
}
```

**2. Zod schemas for runtime validation**

```ts
const { Order } = orders.schemas

Order.parse({ id: 'o-1', status: 'PAID', items: [{ sku: 'book' }] })
// → { id: 'o-1', status: 'PAID', items: [{ sku: 'book', quantity: 1 }] }   (default applied)

Order.safeParse({ status: 'LOST' }).error?.issues
// → id: Invalid input: expected string, received undefined
// → status: Invalid option: expected one of "PENDING"|"PAID"|"SHIPPED"
```

**3. TypeScript types, inferred with no build step**

```ts
type Order = Infer<typeof orders.schemas.Order>
// {
//   id: string
//   status?: 'PENDING' | 'PAID' | 'SHIPPED' | null
//   items?: { sku: string; quantity?: number | null }[] | null
//   tags?: Record<string, string> | null
// }
```

## Type safety while you write the schema

The builder tracks every enum and message you declare, so mistakes fail at compile time and your editor autocompletes the valid names:

```ts
const def = fluentProto()
  .enum('Status', { ACTIVE: 0, BLOCKED: 1 })
  .message('User', ({ f }) => ({
    id: f.string().idx(1).validate((s) => s.required()),
    status: f.ref('Status').idx(2),  // ✅ autocompleted
    role: f.ref('Role').idx(3),      // ❌ type error: 'Role' is not defined
  }))
  .service('UserService', {
    getUser: { request: 'User', response: 'Usr' }, // ❌ type error: typo
  })
```

Inferred types follow your validation rules:

```ts
type User = Infer<typeof def.schemas.User>

const a: User = { id: 'u-1' }                  // ✅
const b: User = { status: 'ACTIVE' }           // ❌ 'id' is required
const c: User = { id: 'u-1', status: 'GONE' }  // ❌ not a Status value
```

## Guide

### Fields

Inside `.message(name, ({ f, oneof }) => ({ ... }))`:

| Builder                        | Proto type                          | TS type                      |
| ------------------------------ | ----------------------------------- | ---------------------------- |
| `f.string()`                   | `string`                            | `string`                     |
| `f.int('int32' \| 'uint32')`   | `int32` / `uint32`                  | `number`                     |
| `f.int('int64' \| 'uint64')`   | `int64` / `uint64`                  | `bigint`                     |
| `f.float('float' \| 'double')` | `float` / `double`                  | `number`                     |
| `f.bool()`                     | `bool`                              | `boolean`                    |
| `f.bytes()`                    | `bytes`                             | `unknown`                    |
| `f.ref('Name')`                | the referenced enum or message      | its inferred type            |
| `f.map(key, value)`            | `map<K, V>` (value may be a `ref`)  | `Record<string, V>`          |

Every field needs `.idx(n)`, its proto field number. Field modifiers:

| Modifier                     | Effect                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------- |
| `.idx(n)`                    | Sets the field number. Required on every field.                                  |
| `.repeated()`                | Makes the field a list: `repeated` in proto, `T[]` in TS.                        |
| `.validate(s => ...)`        | Refines the Zod schema with `s.required()`, `.min()`, `.max()`, `.email()`, `.default()`, and so on. |
| `.optional({ implicit: true })` | Drops the `optional` keyword (proto3 implicit presence).                      |
| `.reserved()`                | Retires the field: its number goes into `reserved` and the field leaves the output. |

### Required vs optional

Fields are **optional and nullable by default**, which matches proto3 semantics. Opt in with `required()`, and chain any other Zod refinement after it:

```ts
id:    f.string().idx(1).validate((s) => s.required()),
email: f.string().idx(2).validate((s) => s.required().email()),
age:   f.int('int32').idx(3).validate((s) => s.min(0).max(150)),
```

On `repeated` fields, `.validate()` applies to each **element**, not the array.

### Enums

```ts
.enum('Currency', { EUR: 0, USD: 1, GBP: 2 })
```

The schema and the type use the **key names** (`'EUR' | 'USD' | 'GBP'`), which matches gRPC loaders configured with `enums: String`.

### Oneof

```ts
.message('Notification', ({ f, oneof }) => ({
  id: f.string().idx(1),
  channel: oneof({
    email: f.string().idx(2),
    sms: f.string().idx(3),
  }),
}))
```

Oneof members are flattened into the message. Zod validation rejects an object with more than one member set, so `{ email, sms }` fails `parse`. As protobuf requires, oneof members can't be `repeated` or `map` fields, and `protoConverter` throws if they are.

### Importing other packages

Share common messages across files with `.import()`. Imported names are referenced with their package prefix:

```ts
const common = fluentProto()
  .syntax('proto3')
  .package('common')
  .message('Money', ({ f }) => ({
    currency: f.string().idx(1).validate((s) => s.required()),
    amount: f.int('int64').idx(2).validate((s) => s.required()),
  }))

const billing = fluentProto()
  .syntax('proto3')
  .package('billing')
  .import('common.proto', common)       // emits: import "common.proto";
  .message('Invoice', ({ f }) => ({
    total: f.ref('common.Money').idx(1), // ✅ typed and autocompleted
  }))

billing.schemas.CommonMoney             // imported schemas get PascalCase, package-prefixed names
```

### Reserved field numbers

```ts
.message('User', ({ f }) => ({
  name: f.string().idx(1),
  legacyId: f.string().idx(2).reserved(),  // retire one field...
}), { reserved: [5, 6] })                  // ...or reserve numbers directly
// → reserved 2, 5, 6;
```

### Custom Zod schema

When the generated schema isn't enough, supply your own. The `.proto` output still comes from the fields:

```ts
.message('Webhook', ({ f }) => ({
  url: f.string().idx(1),
}), {
  schema: (z) => z.object({ url: z.url() }).strict(),
})
```

## API

| Export                                       | Description                                                             |
| -------------------------------------------- | ----------------------------------------------------------------------- |
| `fluentProto()`                              | Starts a definition. Chain `.syntax()`, `.package()`, `.import()`, `.enum()`, `.message()`, `.service()`. |
| `definition.schemas`                         | Zod schemas for all enums and messages, imported ones included.         |
| `Infer<T>`                                   | Infers the TS type of a schema: `Infer<typeof def.schemas.Order>`.      |
| `protoConverter(definition)`                 | Returns the `.proto` file content as a string.                          |

## Limitations

- One `service` per definition. Calling `.service()` again silently replaces the first one. Streaming RPCs aren't supported yet.
- Messages that mix regular fields with a `oneof` infer as `any`. Only pure-oneof messages get a precise union type, and even then TypeScript allows more than one member to be set. Zod validation still enforces it at runtime.
- 64-bit integers are `bigint`.
- `bytes` fields are typed as `unknown`.
- Map keys are always typed as `string` in TypeScript, whatever the proto key type.

## License

MIT
