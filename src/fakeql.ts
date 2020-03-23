import { DocumentNode } from "graphql";

interface FakeQLProps {
  document: DocumentNode;
}
export const fakeQL = ({ document }: FakeQLProps): Record<string, any> => {
  const definition = document.definitions[0];
  if (definition.kind !== "OperationDefinition") {
    throw new Error(
      `FakeQL: Only definitions of kind operation can be mocked. Got definition of kind '${definition.kind}'`
    );
  }

  return {};
};
