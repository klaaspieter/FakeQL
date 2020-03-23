import { parse } from "graphql";
import { fakeQL } from "./index";

describe("fakeQL", () => {
  it("can mock queries", () => {
    const document = parse(`
      query me {
        user {
          name
          age
          teams {
            name
            userCanAdminister
          }
        }
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

  it("fails when document is not an OperationDefinition", () => {
    const document = parse(`
      fragment foo on Foo {
        bar
      }
    `);

    expect(() =>
      fakeQL({
        document,
      })
    ).toThrow(
      "FakeQL: Only definitions of kind operation can be mocked. Got definition of kind 'FragmentDefinition'"
    );
  });
});
