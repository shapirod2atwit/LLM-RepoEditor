const Parser = require('tree-sitter');
const JavaScript = require('tree-sitter-javascript');
const fs = require('fs');
const path = require('path');

const parser = new Parser();
parser.setLanguage(JavaScript);

// Define the directory to analyze
const rootDirectory = './TestFiles'; // Adjust this to your repository path

// Define the nodes and edges for the dependency graph
const dependencyGraph = new Map();

// Define the relation labels
const relations = {
  Imports: 'Imports',
  ImportedBy: 'ImportedBy',
  ParentOf: 'ParentOf',
  ChildOf: 'ChildOf',
  Construct: 'Construct',
  ConstructedBy: 'ConstructedBy',
  BaseClassOf: 'BaseClassOf',
  DerivedClassOf: 'DerivedClassOf',
  Overrides: 'Overrides',
  OverridenBy: 'OverridenBy',
  Calls: 'Calls',
  Calledby: 'Calledby',
  Instantiates: 'Instantiates',
  InstantiatedBy: 'InstantiatedBy',
  Uses: 'Uses',
  UsedBy: 'UsedBy',
  Invokes: 'Invokes',
  InvokedBy: 'InvokedBy',
};

// Function to parse JavaScript files
function parseFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf-8');
  const tree = parser.parse(code);
  const dependencies = {
    [relations.Imports]: [],
    [relations.BaseClassOf]: [],
    [relations.Calls]: [],
    [relations.Invokes]: [],
    [relations.Uses]: [],
  };

  // Search for import statements in the abstract syntax tree (AST)
  tree.rootNode.descendantsOfType('import_statement').forEach((node) => {
    dependencies[relations.Imports].push(node.text);
  });

  // Search for inherited classes in the abstract syntax tree (AST)
  tree.rootNode.descendantsOfType('class_heritage').forEach((node) => {
    dependencies[relations.BaseClassOf].push(node.text);
  });

  // Search for method calls in the abstract syntax tree (AST)
  tree.rootNode.descendantsOfType('call_expression').forEach((node) => {
    dependencies[relations.Calls].push(node.text);
  });

  // Search for method invocations in the abstract syntax tree (AST)
  tree.rootNode.descendantsOfType('invocation_expression').forEach((node) => {
    dependencies[relations.Invokes].push(node.text);
  });

  // Search for field use relations in the abstract syntax tree (AST)
  tree.rootNode.descendantsOfType('element_access_expression').forEach((node) => {
    dependencies[relations.Uses].push(node.text);
  });

  //class_heritage, call_expression, invocation_expression, element_access_expression
  //method_definition
  return dependencies;
}

// Function to build the dependency graph
function buildDependencyGraph(directory) {
  const files = fs.readdirSync(directory);

  files.forEach((file) => {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      // If it's a directory, recursively analyze its contents
      buildDependencyGraph(filePath);
    } else if (stats.isFile() && file.endsWith('.cs')) {
      // If it's a C# file, analyze it
      const dependencies = parseFile(filePath);
      dependencyGraph.set(filePath, dependencies);
    }
  });
}

// Main function
function main() {
  buildDependencyGraph(rootDirectory);

  // Print the dependency graph
  dependencyGraph.forEach((value, key) => {
    console.log(`File: ${key}`);
    console.log(`Imports: ${value[relations.Imports].join(', ')}`);
    console.log(`BaseClass: ${value[relations.BaseClassOf].join(', ')}`);
    console.log(`Calls: ${value[relations.Calls].join(', ')}`);
    console.log(`Invokes: ${value[relations.Invokes].join(', ')}`);
    console.log(`Uses: ${value[relations.Uses].join(', ')}`);
  });
}

main();
