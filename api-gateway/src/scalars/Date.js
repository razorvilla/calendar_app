const { GraphQLScalarType, Kind } = require('graphql');

const dateScalar = new GraphQLScalarType({
  name: 'Date',
  description: 'Date custom scalar type',
  serialize(value) {
    if (value instanceof Date) {
      return value.toISOString(); // Convert outgoing Date to ISO string
    }
    if (typeof value === 'string') {
      // If it's already a string, assume it's an ISO string and return it
      // This handles cases where data sources might return ISO strings directly
      return value;
    }
    return null; // Or throw an error if non-nullable is expected and value is invalid
  },
  parseValue(value) {
    if (typeof value === 'string') {
      return new Date(value); // Convert incoming ISO string to Date
    }
    return null;
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value); // Convert hard-coded AST string to Date
    }
    return null;
  },
});

module.exports = dateScalar;
