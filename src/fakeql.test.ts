import { parse, buildSchema, introspectionFromSchema } from "graphql";
import { fakeQL, FakeQLError } from "./index";

import { writeFileSync, unlinkSync } from "fs";

describe("fakeQL", () => {
  it("mocks scalars with default values", () => {
    const schema = buildSchema(`
      type Query {
        id: ID!
        nullId: ID
        string: String!
        nullString: String
        int: Int!
        nullInt: Int
        float: Float!
        nullFloat: Float
        boolean: Boolean!
        nullBoolean: Boolean
      }
    `);
    const document = parse(`
      query {
        __typename
        id
        nullId
        string
        nullString
        int
        nullInt
        float
        nullFloat
        boolean
        nullBoolean
      }
    `);

    const mock = fakeQL({ document, schema });

    expect(mock).toEqual({
      __typename: "Query",
      id: `mock-value-for-field-"id"`,
      nullId: `mock-value-for-field-"nullId"`,
      string: `mock-value-for-field-"string"`,
      nullString: `mock-value-for-field-"nullString"`,
      int: 42,
      nullInt: 42,
      float: 4.2,
      nullFloat: 4.2,
      boolean: false,
      nullBoolean: false,
    });
  });

  it("mocks custom types", () => {
    const schema = buildSchema(`
      type User {
        name: String!
        age: Int!
      }

      type Query {
        me: User
      }
    `);
    const document = parse(`
      query {
        __typename
        me {
          __typename
          name
          age
        }
      }
    `);

    const mock = fakeQL({ document, schema });

    expect(mock).toEqual({
      __typename: "Query",
      me: {
        __typename: "User",
        name: `mock-value-for-field-"name"`,
        age: 42,
      },
    });
  });

  it("mocks lists with scalars", () => {
    const schema = buildSchema(`
      type User {
        hobbies: [String]!
      }

      type Query {
        me: User
      }
    `);
    const document = parse(`
      query {
        __typename
        me {
          __typename
          hobbies
        }
      }
    `);

    const mock = fakeQL({ document, schema });

    expect(mock).toEqual({
      __typename: "Query",
      me: {
        __typename: "User",
        hobbies: [`mock-value-for-field-"hobbies"`],
      },
    });
  });

  it("mocks lists with enums", () => {
    const schema = buildSchema(`
      type User {
        roles: [Role]!
      }

      enum Role {
        ADMIN
        MEMBER
      }

      type Query {
        me: User
      }
    `);
    const document = parse(`
      query {
        me {
          roles
        }
      }
    `);

    const mock = fakeQL({ document, schema });

    expect(mock).toEqual({
      me: {
        roles: ["ADMIN"],
      },
    });
  });

  it("mocks lists with custom types", () => {
    const schema = buildSchema(`
      type User {
        hobbies: [Hobby]!
      }

      type Hobby {
        name: String!
      }

      type Query {
        me: User
      }
    `);
    const document = parse(`
      query {
        __typename
        me {
          __typename
          hobbies {
            __typename
            name
          }
        }
      }
    `);

    const mock = fakeQL({ document, schema });

    expect(mock).toEqual({
      __typename: "Query",
      me: {
        __typename: "User",
        hobbies: [{ __typename: "Hobby", name: `mock-value-for-field-"name"` }],
      },
    });
  });

  it("mocks weirdly nested lists", () => {
    const schema = buildSchema(`
      type User {
        name: String!
        hobbies: [[[String!]!]!]
        friends: [[[User!]!]!]!
      }


      type Query {
        me: User
      }
    `);
    const document = parse(`
      query {
        __typename
        me {
          __typename
          hobbies
          friends {
            __typename
            name
          }
        }
      }
    `);

    const mock = fakeQL({ document, schema });

    expect(mock).toEqual({
      __typename: "Query",
      me: {
        __typename: "User",
        hobbies: [[[`mock-value-for-field-"hobbies"`]]],
        friends: [
          [[{ __typename: "User", name: `mock-value-for-field-"name"` }]],
        ],
      },
    });
  });

  it("mocks custom enums", () => {
    const schema = buildSchema(`
      type User {
        name: String!
        role: Role!
      }

      enum Role {
        ADMIN
        MEMBER
      }

      type Query {
        me: User
      }
    `);
    const document = parse(`
      query {
        me {
          name
          role
        }
      }
    `);

    const mock = fakeQL({ document, schema });

    expect(mock).toEqual({
      me: { name: `mock-value-for-field-"name"`, role: "ADMIN" },
    });
  });

  it("mocks nested types", () => {
    const schema = buildSchema(`
      type User {
        name: String!
        friends: [User]!
        age: Int!
        role: String!
      }

      type Query {
        me: User
      }
    `);
    const document = parse(`
      query {
        __typename
        me {
          __typename
          friends {
            __typename
            name
            age
            friends {
              friends {
                name
              }
            }
          }
          # Order is important. Putting role below friends ensures that we enter
          # the friends list generete the mock friend and then leave the list to
          # generate the mock role.
          role
        }
      }
    `);

    const mock = fakeQL({ document, schema });

    expect(mock).toEqual({
      __typename: "Query",
      me: {
        __typename: "User",
        role: `mock-value-for-field-"role"`,
        friends: [
          {
            __typename: "User",
            name: `mock-value-for-field-"name"`,
            age: 42,
            friends: [
              {
                friends: [
                  {
                    name: `mock-value-for-field-"name"`,
                  },
                ],
              },
            ],
          },
        ],
      },
    });
  });

  it("mocks sibling types", () => {
    const schema = buildSchema(`
      type User {
        name: String!
        friends: [User]!
        invoices: [Invoice]!
        age: Int!
        role: String!
      }

      type Invoice {
        date: String!
      }

      type Query {
        me: User
      }
    `);
    const document = parse(`
      query {
        __typename
        me {
          __typename
          friends {
            __typename
            name
            age
          }
          invoices {
            __typename
            date
          }
        }
      }
    `);

    const mock = fakeQL({ document, schema });

    expect(mock).toEqual({
      __typename: "Query",
      me: {
        __typename: "User",
        friends: [
          { __typename: "User", name: `mock-value-for-field-"name"`, age: 42 },
        ],
        invoices: [
          { __typename: "Invoice", date: `mock-value-for-field-"date"` },
        ],
      },
    });
  });

  it("mocks nested and sibling types", () => {
    const schema = buildSchema(`
      type User {
        name: String!
        friends: [User]!
        invoices: [Invoice]!
        age: Int!
        role: String!
      }

      type Invoice {
        date: String!
        user: User!
      }

      type Query {
        me: User
      }
    `);
    const document = parse(`
      query {
        __typename
        me {
          __typename
          friends {
            __typename
            name
            invoices {
              user {
                invoices {
                  date
                  user {
                    name
                  }
                }
                name
              }
            }
            age
          }
          invoices {
            __typename
            date
            user {
              invoices {
                user {
                  name
                }
                date
              }
            }
          }
        }
      }
    `);

    const mock = fakeQL({ document, schema });

    expect(mock).toEqual({
      __typename: "Query",
      me: {
        __typename: "User",
        friends: [
          {
            __typename: "User",
            name: `mock-value-for-field-"name"`,
            age: 42,
            invoices: [
              {
                user: {
                  name: `mock-value-for-field-"name"`,
                  invoices: [
                    {
                      date: `mock-value-for-field-"date"`,
                      user: {
                        name: `mock-value-for-field-"name"`,
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
        invoices: [
          {
            __typename: "Invoice",
            date: `mock-value-for-field-"date"`,
            user: {
              invoices: [
                {
                  date: `mock-value-for-field-"date"`,
                  user: { name: `mock-value-for-field-"name"` },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("mocks fragments (fragment comes first)", () => {
    const schema = buildSchema(`
      type User {
        name: String!
      }

      type Query {
        me: User!
      }
    `);
    const document = parse(`
      fragment user on User {
        name
      }

      query {
        me {
          ...user
        }
      }
    `);

    const mock = fakeQL({ document, schema });

    expect(mock).toEqual({
      me: { name: `mock-value-for-field-"name"` },
    });
  });

  it("mocks fragments (fragment comes last)", () => {
    const schema = buildSchema(`
      type User {
        name: String!
      }

      type Query {
        me: User!
      }
    `);
    const document = parse(`
      query {
        me {
          ...user
        }
      }

      fragment user on User {
        name
      }
    `);

    const mock = fakeQL({ document, schema });

    expect(mock).toEqual({
      me: { name: `mock-value-for-field-"name"` },
    });
  });

  it("mocks sibling fragments", () => {
    const schema = buildSchema(`
      type User {
        name: String!
        age: Int!
      }

      type Query {
        me: User!
      }
    `);
    const document = parse(`
      query {
        me {
          ...user
        }
      }

      fragment user on User {
        ...name
        ...age
      }

      fragment name on User {
        name
      }

      fragment age on User {
        age
      }
    `);

    const mock = fakeQL({ document, schema });

    expect(mock).toEqual({
      me: {
        name: `mock-value-for-field-"name"`,
        age: 42,
      },
    });
  });

  it("mocks nested fragments", () => {
    const schema = buildSchema(`
      type User {
        age: Int!
        hobbies: [Hobby!]!
      }

      type Hobby {
        name: String!
      }

      type Query {
        me: User!
      }
    `);
    const document = parse(`
      query {
        me {
          ...user
        }
      }

      fragment user on User {
        ...hobbies
        age
      }

      fragment hobbies on User {
        hobbies {
          name
        }
      }
    `);

    const mock = fakeQL({ document, schema });

    expect(mock).toEqual({
      me: {
        hobbies: [{ name: `mock-value-for-field-"name"` }],
        age: 42,
      },
    });
  });

  it("mocks nested list fragments", () => {
    const schema = buildSchema(`
      type User {
        hobbies: [Hobby!]!
      }

      type Hobby {
        name: String!
      }

      type Query {
        me: User!
      }
    `);
    const document = parse(`
      query {
        me {
          ...user
        }
      }

      fragment user on User {
        hobbies {
          ...hobby
        }
      }

      fragment hobby on Hobby {
        name
      }
    `);

    const mock = fakeQL({ document, schema });

    expect(mock).toEqual({
      me: {
        hobbies: [{ name: `mock-value-for-field-"name"` }],
      },
    });
  });

  it("merges fragments with existing mocks", () => {
    const schema = buildSchema(`
      type User {
        id: ID!
        name: String!
        age: Int!
      }

      type Query {
        me: User!
      }
    `);
    const document = parse(`
      query {
        me {
          name
          ...user
          age
        }
      }

      fragment user on User {
        id
      }
    `);

    const mock = fakeQL({ document, schema });

    expect(mock).toEqual({
      me: {
        id: `mock-value-for-field-"id"`,
        name: `mock-value-for-field-"name"`,
        age: 42,
      },
    });
  });

  it("throws when spreading an unknown fragment", () => {
    const schema = buildSchema(`
      type User {
        name: String!
      }

      type Query {
        me: User!
      }
    `);
    const document = parse(`
      query {
        me {
          ...unknown
        }
      }
    `);

    expect(() => {
      fakeQL({ document, schema });
    }).toThrow();
  });

  it("creates the schema from an IntrospectionQuery", () => {
    const schema = buildSchema(`
      type User {
        name: String
      }

      type Query {
        me: User!
      }
    `);
    const document = parse(`
      query me {
        me {
          name
        }
      }
    `);
    const introspectionQuery = introspectionFromSchema(schema);

    expect(
      fakeQL({
        document,
        schema: introspectionQuery,
      })
    ).toEqual({
      me: {
        name: 'mock-value-for-field-"name"',
      },
    });
  });

  it("supports custom scalar resolvers", () => {
    const schema = buildSchema(`
      type User {
        name: String!
        age: Int!
      }

      type Query {
        me: User!
      }
    `);
    const document = parse(`
      query me {
        me {
          name
          age
        }
      }
    `);
    const introspectionQuery = introspectionFromSchema(schema);

    expect(
      fakeQL({
        document,
        schema: introspectionQuery,
        resolvers: {
          String(): string {
            return "custom-string";
          },
          Int(): number {
            return 84;
          },
        },
      })
    ).toEqual({
      me: {
        name: "custom-string",
        age: 84,
      },
    });
  });

  it("supports custom type resolvers", () => {
    const schema = buildSchema(`
      type User {
        name: String!
        age: Int!
      }
      type Query {
        me: User!
      }
    `);
    const document = parse(`
      query me {
        me {
          name
          age
        }
      }
    `);
    const introspectionQuery = introspectionFromSchema(schema);

    expect(
      fakeQL({
        document,
        schema: introspectionQuery,
        resolvers: {
          User(): unknown {
            return { name: "Hello" };
          },
        },
      })
    ).toEqual({
      me: {
        name: "Hello",
        age: 42,
      },
    });
  });

  it("supports custom enum type resolvers", () => {
    const schema = buildSchema(`
      type User {
        name: String!
        role: Role!
      }

      enum Role {
        ADMIN
        MEMBER
      }

      type Query {
        me: User
      }
    `);
    const document = parse(`
      query {
        me {
          name
          role
        }
      }
    `);

    const mock = fakeQL({
      document,
      schema,
      resolvers: {
        Role(): string {
          return "MEMBER";
        },
      },
    });

    expect(mock).toEqual({
      me: { name: `mock-value-for-field-"name"`, role: "MEMBER" },
    });
  });

  it("fails when schema is invalid", () => {
    const schema = buildSchema(`
      # Schema is missing type Query
      type Team {
        name: String!
        userCanAdminister: Boolean!
      }
    `);

    expect(() => {
      fakeQL({
        document: parse(`query { me { name } }`),
        schema,
      });
    }).toThrow();
  });

  it("fails when document is invalid", () => {
    const schema = buildSchema(`type Query { x: String! }`);
    const document = parse(`
      # Document is querying a type that doesn't exit
      type Team {
        name: String!
        userCanAdminister: Boolean!
      }
    `);

    expect(() =>
      fakeQL({
        document,
        schema,
      })
    ).toThrow();
  });

  it("supports customizing the validation rules", () => {
    const schema = buildSchema(`type Query { x: String! }`);
    const document = parse(`
      # This is a syntactically valid document but querying the wrong fields
      # With all validation rules disabled querying the wrong fields won't throw
      # an error
      type Team {
        name: String!
        userCanAdminister: Boolean!
      }
    `);

    expect(() =>
      fakeQL({
        document,
        schema,
        validationRules: [],
      })
    ).not.toThrow();
  });

  it("can take schema from graphql-config", () => {
    writeFileSync(
      "./.graphqlconfig",
      JSON.stringify({ schemaPath: "./schema.json" })
    );
    writeFileSync(
      "./schema.json",
      JSON.stringify(
        introspectionFromSchema(
          buildSchema(`
          type Query { x: String ! }
        `)
        ),
        null,
        2
      )
    );
    const document = parse(`query { x }`);

    const mock = fakeQL({ document });

    expect(mock).toEqual({ x: `mock-value-for-field-"x"` });

    unlinkSync("./schema.json");
    unlinkSync("./.graphqlconfig");
  });

  it("fails when no schema is provided and graphql-config cannot be found", () => {
    const document = parse(`query { x }`);

    expect(() => {
      fakeQL({ document });
    }).toThrow(FakeQLError);
  });
});
