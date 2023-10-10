const Parser = require('tree-sitter');
const JavaScript = require('tree-sitter-javascript');

const parser = new Parser();
parser.setLanguage(JavaScript);

//change to take files
const sourceCode = 'let x = 1; console.log(x);';
const tree = parser.parse(sourceCode);

console.log(tree.rootNode.toString());

// (program
//   (lexical_declaration
//     (variable_declarator (identifier) (number)))
//   (expression_statement
//     (call_expression
//       (member_expression (identifier) (property_identifier))
//       (arguments (identifier)))))

const callExpression = tree.rootNode.child(1).firstChild;
console.log(callExpression);

// { type: 'call_expression',
//   startPosition: {row: 0, column: 16},
//   endPosition: {row: 0, column: 30}, 
//   startIndex: 0,
//   endIndex: 30 }