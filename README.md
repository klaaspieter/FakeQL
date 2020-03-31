# FakeQL

Automatic GraphQL mocks

## Installation

### npm

```sh
npm install --save-dev fakeql
```

### yarn

```sh
yarn add --dev fakeql
```

## Usage

### Basic

```javascript
import { fakeQL } from "fakeql";
import { parse, buildSchema } from "graphql";

const schema = buildSchema(`
  type Query {
    id: ID!
    string: String!
    int: Int!
    float: Float!
    boolean: Boolean!
  }
`);
const document = parse(`
  query {
    __typename
    id
    string
    int
    float
    boolean
  }
`);

fakeQL({ document, schema });
/* { 
  __typename: "Query",
  id: `mock-value-for-field-"id"`,
  string: `mock-value-for-field-"string"`,
  int: 42,
  float: 4.2,
  boolean: false,
}
*/
```

### graphql-config

If no `schema` is provided FakeQL will look for one using [graphql-config]. Assuming it is configured the above example would become:

```javascript
import { fakeQL } from "fakeql";
import { parse } from "graphql";

const document = parse(`
  query {
    __typename
    id
    string
    int
    float
    boolean
  }
`);

fakeQL({ document });
/* { 
  __typename: "Query",
  id: `mock-value-for-field-"id"`,
  string: `mock-value-for-field-"string"`,
  int: 42,
  float: 4.2,
  boolean: false,
}
*/
```

[graphql-config]: https://github.com/kamilkisiela/graphql-config/tree/legacy#usage

### Resolvers

Real life queries will be more complex and in real testing you'll want to configure specific parts of the mock. Each mock can be fine tuned by passing a `resolvers` map to `fakeQL`. For example to change the default value of the `String` and `Int` scalars:

```javascript
const document = parse(`
  query me {
    me { # User!
      name # String!
      age # Int!
    }
  }
`);

fakeQL({
  document,
  resolvers: {
    String() {
      return "custom-string";
    },
    Int() {
      return 84;
    },
  },
})
/* {
  me: {
    name: "custom-string",
    age: 84,
  },
}
*/
```

This also works for types and custom enums:

```javascript
const schema = buildSchema(`
  enum Role {
    ADMIN # By default fakeQL picks this first enum value
    MEMBER
  }

  type User {
    name: String!
    role: Role!
    age: Int!
  }

  type Query {
    me: User
  }
`);
const document = parse(`
  query {
    me {
      name
      age
      role
    }
  }
`);

fakeQL({
  document,
  schema,
  resolvers: {
    User() {
      return { name: "Hello" }
    }
    Role() {
      return "MEMBER";
    },
  },
});
/* {
  me: {
    name: "Hello",
    age: 42,
    role: "MEMBER",
  }
}
*/
```
