import { parse, buildSchema, introspectionFromSchema } from "graphql";
import { fakeQL } from "./index";

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
});
