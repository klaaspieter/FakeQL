import { assign } from "./index";

describe("assign", () => {
  it("returns unmodified object when path is empty", () => {
    expect(assign({ name: "Wei Shi Lindon" }, [], "")).toEqual({
      name: "Wei Shi Lindon",
    });
  });

  it("assigns to the value at path", () => {
    expect(assign({ name: "" }, ["name"], "Wei Shi Lindon")).toEqual({
      name: "Wei Shi Lindon",
    });
  });

  it("works with nested paths", () => {
    expect(assign({ me: {} }, ["me", "name"], "Wei Shi Lindon")).toEqual({
      me: {
        name: "Wei Shi Lindon",
      },
    });
  });

  it("creates the nested path if undefined", () => {
    expect(assign({}, ["me", "name"], "Wei Shi Lindon")).toEqual({
      me: {
        name: "Wei Shi Lindon",
      },
    });
  });

  it("creates the nested path if null", () => {
    expect(assign({ me: null }, ["me", "name"], "Wei Shi Lindon")).toEqual({
      me: {
        name: "Wei Shi Lindon",
      },
    });
  });

  it("supports array indicies", () => {
    expect(
      assign({ me: { teams: [] } }, ["me", "teams", 0, "name"], "Arelius")
    ).toEqual({
      me: {
        teams: [{ name: "Arelius" }],
      },
    });
  });
});
