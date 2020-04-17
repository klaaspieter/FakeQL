import {
  visit,
  visitWithTypeInfo,
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
  ASTNode,
  VisitFn,
  isWrappingType,
  FragmentDefinitionNode,
  GraphQLEnumType,
} from "graphql";
import { FakeQLError } from "./error";
import { getGraphQLProjectConfig } from "graphql-config";

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

const valueForEnumType = (
  type: GraphQLEnumType,
  resolvers: MockResolverMap
): string | undefined => {
  const resolver = resolvers[type.name];

  if (resolver) {
    return resolver() as string;
  }

  const values = type.getValues();
  // A GraphQL enum with no members should be impossible, but it's
  // not enforced in the types so we double check it here.
  if (values.length > 0) {
    return values[0].name;
  }
};

interface FakeReducerArguments {
  ast: ASTNode;
  typeInfo: TypeInfo;
  resolvers: MockResolverMap;
  fragments: {
    [key: string]: { definition: FragmentDefinitionNode; mock?: Mock };
  };
}
const fakeFor = ({
  ast,
  typeInfo,
  resolvers,
  fragments,
}: FakeReducerArguments): Mock => {
  const notHandled: VisitFn<ASTNode, ASTNode> = () => null;

  return visit(
    ast,
    visitWithTypeInfo(typeInfo, {
      leave: {
        Document(node): Mock {
          return node.definitions[0];
        },

        OperationDefinition(node): Mock {
          return node.selectionSet;
        },

        SelectionSet(node): Mock {
          let type = typeInfo.getType();

          if (isNonNullType(type)) {
            type = type.ofType;
          }

          const object = node.selections.reduce(
            (mock, selection) => ({ ...mock, ...selection }),
            {}
          );

          return object;
        },

        FragmentSpread(node): Mock {
          const fragment = fragments[node.name.value];

          if (!fragment.mock) {
            fragment.mock = fakeFor({
              ast: fragment.definition.selectionSet,
              typeInfo,
              resolvers,
              fragments,
            });
          }

          return fragment.mock;
        },

        Field(node): Mock | null {
          let type = typeInfo.getType();

          if (isNonNullType(type)) {
            type = type.ofType;
          }

          if (node.name.value === "__typename" && typeInfo.getParentType()) {
            const parentType = typeInfo.getParentType() as GraphQLCompositeType;
            return { __typename: parentType.name };
          } else if (isScalarType(type)) {
            return {
              [node.name.value]: valueForScalarType(
                type,
                node.name.value,
                resolvers
              ),
            };
          } else if (isObjectType(type)) {
            const resolver = resolvers[type.name];
            if (resolver) {
              const resolvedValue = resolver() as Mock;
              return {
                [node.name.value]: { ...node.selectionSet, ...resolvedValue },
              };
            }

            return { [node.name.value]: node.selectionSet };
          } else if (isListType(type)) {
            let itemType = type.ofType;

            let depth = 1;

            while (isWrappingType(itemType)) {
              if (isListType(itemType)) {
                depth += 1;
              }
              itemType = itemType.ofType;
            }

            let value: unknown = node.selectionSet;
            if (isScalarType(itemType)) {
              value = valueForScalarType(itemType, node.name.value, resolvers);
            } else if (isEnumType(itemType)) {
              value = valueForEnumType(itemType, resolvers);
            }

            while (depth > 0) {
              depth -= 1;

              value = [value];
            }

            return {
              [node.name.value]: value,
            };

            return { [node.name.value]: node.selectionSet };
          } else if (isEnumType(type)) {
            return { [node.name.value]: valueForEnumType(type, resolvers) };
          }

          return null;
        },
        Name(node): ASTNode {
          return node;
        },

        VariableDefinition: notHandled,
        Variable: notHandled,
        Argument: notHandled,
        InlineFragment: notHandled,
        FragmentDefinition: notHandled,
        IntValue: notHandled,
        FloatValue: notHandled,
        StringValue: notHandled,
        BooleanValue: notHandled,
        NullValue: notHandled,
        EnumValue: notHandled,
        ListValue: notHandled,
        ObjectValue: notHandled,
        ObjectField: notHandled,
        Directive: notHandled,
        NamedType: notHandled,
        ListType: notHandled,
        NonNullType: notHandled,
        SchemaDefinition: notHandled,
        OperationTypeDefinition: notHandled,
        ScalarTypeDefinition: notHandled,
        ObjectTypeDefinition: notHandled,
        FieldDefinition: notHandled,
        InputValueDefinition: notHandled,
        InterfaceTypeDefinition: notHandled,
        UnionTypeDefinition: notHandled,
        EnumTypeDefinition: notHandled,
        EnumValueDefinition: notHandled,
        InputObjectTypeDefinition: notHandled,
        DirectiveDefinition: notHandled,
        SchemaExtension: notHandled,
        ScalarTypeExtension: notHandled,
        ObjectTypeExtension: notHandled,
        InterfaceTypeExtension: notHandled,
        UnionTypeExtension: notHandled,
        EnumTypeExtension: notHandled,
        InputObjectTypeExtension: notHandled,
      },
    })
  );
};

export interface FakeQLArguments {
  document: DocumentNode;
  schema?: GraphQLSchema | IntrospectionQuery;
  resolvers?: MockResolverMap;
  validationRules?: ValidationRule[];
}
export const fakeQL = ({
  document,
  schema,
  resolvers = {},
  validationRules,
}: FakeQLArguments): Mock => {
  if (schema && !isSchema(schema)) {
    schema = buildClientSchema(schema);
  }

  if (!schema) {
    try {
      schema = getGraphQLProjectConfig().getSchema();
    } catch (error) {
      throw new FakeQLError(
        "There was a problem with your graphql-config and no schema was provided as an argument",
        [error]
      );
    }
  }

  const schemaValidationErrors = validateSchema(schema);
  if (schemaValidationErrors.length > 0) {
    throw new FakeQLError("Invalid Schema", schemaValidationErrors);
  }

  const validationErrors = validate(schema, document, validationRules);
  if (validationErrors.length > 0) {
    throw new FakeQLError("Invalid Document", validationErrors);
  }

  const typeInfo = new TypeInfo(schema);

  const fragments: {
    [key: string]: { definition: FragmentDefinitionNode; mock?: Mock };
  } = {};

  for (const definition of document.definitions) {
    if (definition.kind !== "FragmentDefinition") {
      continue;
    }

    fragments[definition.name.value] = { definition };
  }

  return fakeFor({ ast: document, typeInfo, resolvers, fragments });
};
