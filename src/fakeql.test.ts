import { parse } from "graphql";
import { fakeQL } from "./index";

describe("fakeQL", () => {
  it("can mock queries with fragments", () => {
    const document = parse(`
      query me {
        user {
          name
          age
          teams {
            ...team
          }
        }
      }

      fragment team on User {
        name
        userCanAdminister
      }

    `);

    expect(
      fakeQL({
        document,
      })
    ).toEqual({
      user: {
        name: 'mock-value-for-field-"name"',
        age: 'mock-value-for-field-"age"',
        teams: {
          name: 'mock-value-for-field-"name"',
          userCanAdminister: 'mock-value-for-field-"userCanAdminister"',
        },
      },
    });
  });

  it("fails when document has no operations", () => {
    const document = parse(`
      type Team {
        name: String!
        userCanAdminister: Boolean!
      }
    `);

    expect(() =>
      fakeQL({
        document,
      })
    ).toThrow(
      "FakeQL: Document has no operations. Ensure your GraphQL document has a query directive"
    );
  });
});
