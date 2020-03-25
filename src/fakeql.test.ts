import { parse, buildSchema, introspectionFromSchema } from "graphql";
import { fakeQL } from "./index";

const schema = buildSchema(`
  scalar UUID

  type User {
    id: ID!
    uuid: UUID!
    name: String!
    age: Int!
    teams: [Team]!
  }

  type Team {
    name: String!
    userCanAdminister: Boolean!
    price: Float!
  }

  type Query {
    me: User
  }
`);

describe("fakeQL", () => {
  it("can mock queries", () => {
    const document = parse(`
      query me {
        me {
          __typename
          id
          uuid
          name
          age
          teams {
            ...team
          }
        }
      }

      fragment team on Team {
        __typename
        name
        userCanAdminister
        price
      }
    `);

    expect(
      fakeQL({
        document,
        schema,
      })
    ).toEqual({
      me: {
        __typename: "User",
        id: 'mock-value-for-field-"id"',
        uuid: 'mock-value-for-field-"uuid"',
        name: 'mock-value-for-field-"name"',
        age: 42,
        teams: [
          {
            __typename: "Team",
            name: 'mock-value-for-field-"name"',
            userCanAdminister: false,
            price: 4.2,
          },
        ],
      },
    });
  });

  it("creates the schema from an IntrospectionQuery", () => {
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

  it("fails when schema is invalid", () => {
    const schema = buildSchema(`
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
    const document = parse(`
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
});
