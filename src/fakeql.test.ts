import { parse, buildSchema } from "graphql";
import { fakeQL } from "./index";

const schema = buildSchema(`
  type User {
    name: String!
    age: Int!
    teams: [Team]!
  }

  type Team {
    name: String!
    userCanAdminister: Boolean!
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
        name: 'mock-value-for-field-"name"',
        age: 42,
        teams: [
          {
            __typename: "Team",
            name: 'mock-value-for-field-"name"',
            userCanAdminister: false,
          },
        ],
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
