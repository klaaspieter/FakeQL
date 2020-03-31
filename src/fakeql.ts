import {
  visit,
  visitWithTypeInfo,
  parse,
  isNonNullType,
  DocumentNode,
  validate,
  validateSchema,
  TypeInfo,
  GraphQLSchema,
  isObjectType,
  isScalarType,
  GraphQLScalarType,
  isListType,
  GraphQLCompositeType,
  buildClientSchema,
  isSchema,
  IntrospectionQuery,
  ValidationRule,
  isEnumType,
} from "graphql";
import { FakeQLError } from "./error";
import set from "lodash.set";
import get from "lodash.get";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Mock = Record<string, any>;

type MockResolverMap = { [key: string]: MockResolver };
interface MockResolver {
  (): unknown;
}

const valueForScalarType = (
  type: GraphQLScalarType,
  name: string,
  resolvers?: MockResolverMap
): unknown => {
  if (resolvers && resolvers[type.name]) {
    return resolvers[type.name]();
  }

  switch (type.name) {
    default:
    case "String":
      return `mock-value-for-field-"${name}"`;

    case "Int":
      return 42;

    case "Float":
      return 4.2;

    case "Boolean":
      return false;
  }
};

interface FakeQLProps {
  document: DocumentNode;
  schema: GraphQLSchema | IntrospectionQuery;
  resolvers?: MockResolverMap;
  validationRules?: ValidationRule[];
}
export const fakeQL = ({
  document,
  schema,
  resolvers,
  validationRules,
}: FakeQLProps): Mock => {
  if (!isSchema(schema)) {
    schema = buildClientSchema(schema);
  }

  const schemaValidationErrors = validateSchema(schema);
  if (schemaValidationErrors.length > 0) {
    throw new FakeQLError("Invalid Schema", schemaValidationErrors);
  }

  const source =
    document && document.loc && document.loc.source && document.loc.source.body;
  if (!source) {
    throw new FakeQLError("The provided document has no source");
  }
  const documentAST = parse(source);

  const validationErrors = validate(schema, documentAST, validationRules);
  if (validationErrors.length > 0) {
    throw new FakeQLError("Invalid Document", validationErrors);
  }

  const typeInfo = new TypeInfo(schema);

  let mock: Mock = {};
  let path: (string | number)[] = [];
  visit(
    documentAST,
    visitWithTypeInfo(typeInfo, {
      Field: {
        enter(node): void {
          let type = typeInfo.getType();

          if (isNonNullType(type)) {
            type = type.ofType;
          }

          if (isScalarType(type)) {
            if (node.name.value === "__typename" && typeInfo.getParentType()) {
              const parentType = typeInfo.getParentType() as GraphQLCompositeType;
              mock = set(mock, [...path, node.name.value], parentType.name);
            } else {
              const defaultValue = valueForScalarType(
                type,
                node.name.value,
                resolvers
              );
              const value = get(mock, [...path, node.name.value], defaultValue);
              mock = set(mock, [...path, node.name.value], value);
            }
          } else if (isListType(type)) {
            path = [...path, node.name.value, 0];
          } else if (isObjectType(type)) {
            if (resolvers && resolvers[type.name]) {
              mock = set(
                mock,
                [...path, node.name.value],
                resolvers[type.name]()
              );
            }
            path = [...path, node.name.value];
          } else if (isEnumType(type)) {
            const values = type.getValues();
            let value: unknown;

            if (resolvers && resolvers[type.name]) {
              value = resolvers[type.name]();
            } else if (values.length > 0) {
              // A GraphQL enum with no members should be impossible, but it's
              // not enforced in the types. In other words it is possible this
              // array is empty.
              value = values[0].name;
            }

            mock = set(mock, [...path, node.name.value], value);
          }
        },
        leave(): void {
          let type = typeInfo.getType();

          if (isNonNullType(type)) {
            type = type.ofType;
          }

          if (isListType(type)) {
            path.pop();
            path.pop();
          } else if (isObjectType(type)) {
            path.pop();
          }
        },
      },
    })
  );

  return mock;
};
