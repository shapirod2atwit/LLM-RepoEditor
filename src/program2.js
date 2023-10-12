const Parser = require('tree-sitter');
const JavaScript = require('tree-sitter-javascript');
const fs = require('fs');
const path = require('path');

const parser = new Parser();
parser.setLanguage(JavaScript);

// Define the directory to analyze
const rootDirectory = './src'; // Adjust this to your repository path

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
};

// Function to parse JavaScript files
function parseJavaScriptFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf-8');
  const tree = parser.parse(code);
  const dependencies = [];

  // Search for import statements in the abstract syntax tree (AST)
  tree.rootNode.descendantsOfType('import_statement').forEach((node) => {
    const importPath = node.text.replace(/['"]/g, '');
    dependencies.push(importPath);
  });

  //class_heritage, call_expression 
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
    } else if (stats.isFile() && file.endsWith('.js')) {
      // If it's a JavaScript file, analyze it
      const dependencies = parseJavaScriptFile(filePath);
      dependencyGraph.set(filePath, { [relations.Imports]: dependencies });
    }
  });
}

// Main function
function main() {
  buildDependencyGraph(rootDirectory);

  // Print the dependency graph
  dependencyGraph.forEach((value, key) => {
    console.log(`File: ${key}`);
    console.log(`Dependencies: ${value[relations.Imports].join(', ')}`);
  });
}

main();
