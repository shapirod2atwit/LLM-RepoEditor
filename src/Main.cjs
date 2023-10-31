const Parser = require('tree-sitter');
const JavaScript = require('tree-sitter-javascript');
const CSharp = require('tree-sitter-c-sharp');
const fs = require('fs');
const path = require('path');
const { HfInference } = require("@huggingface/inference");

//bloom api setup
const inference = new HfInference('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');
const model = "bigscience/bloom";

//send prompt to llm
async function wrapper(prompt){
    const result = await inference.textGeneration({
        inputs: prompt,
        model: model,
    });

    return result;
}

//make in-file edits
function editFile(file, oldBlock, newBlock){
  fs.readFile(file, 'utf-8', (err, data) => {
    if (err) {
      console.error('Error reading the file:', err);
      return;
    }
  
    // Split the old block and new block into lines
    const oldLines = oldBlock.split('\n');
    const newLines = newBlock.split('\n');
  
    // Iterate through the lines in the file
    const lines = data.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === oldLines[0].trim()) {
        let match = true;
        for (let j = 1; j < oldLines.length; j++) {
          if (!lines[i + j] || !areLinesEqualIgnoringSemicolons(lines[i + j], oldLines[j].trim())) {
            match = false;
            break;
          }
        }
    
        if (match) {
          // Replace the old function with the new function
          lines.splice(i, oldLines.length, ...newLines);
          i += newLines.length - 1;
        }
      }
    }
    
    function areLinesEqualIgnoringSemicolons(lineA, lineB) {
      // Remove semicolons and trim any whitespace before comparing
      return lineA.replace(/;/g, '').trim() === lineB.replace(/;/g, '').trim();
    }
    
  
    const updatedContent = lines.join('\n');
  
    fs.writeFile(file, updatedContent, 'utf-8', (writeErr) => {
      if (writeErr) {
        console.error('Error writing to the file:', writeErr);
      } else {
        console.log(`Function replaced with new function line by line.`);
      }
    });
  });
}

//parser setup
const parser = new Parser();
parser.setLanguage(CSharp);

// Define the directory to analyze
const rootDirectory = './TestFiles'; // Adjust this to your repository path

// initialize dependencyGraph and forest
var dependencyGraph = new Map();
var forest = new Map();

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

// Function to parse files
function parseFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf-8');
  const tree = parser.parse(code);

  return tree;
}

//used to find dependencies between files
function findRelationships(dependencyGraph){

  var relations;

  dependencyGraph.forEach((value, key) => {
    if(key != value[relations.UsedBy] && key != value[relations.Calledby] && key != value[relations.InstantiatedBy]){
      for(var i = 0; i < value[relations.Uses].length; i++){
        
      }
      for(var i = 0; i < value[relations.Calls].length; i++){
        
      }
      for(var i = 0; i < value[relations.Instantiates].length; i++){
        
      }
    }
  });

  return relations;
  
}

function findSignificantBlocks(forest){
  const dependencies = {
    [relations.Imports]: [],
    [relations.BaseClassOf]: [],
    [relations.Calls]: [],
    [relations.Calledby]: [],
    [relations.Uses]: [],
    [relations.UsedBy]: [],
    [relations.Instantiates]: [],
    [relations.InstantiatedBy]: [],
  };

  forest.forEach((value, key) => {

  });

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
    dependencies[relations.Calls].push(node.text);
  });

  // Search for object instantiation in the abstract syntax tree (AST)
  tree.rootNode.descendantsOfType('object_creation_expression').forEach((node) => {
    dependencies[relations.Instantiates].push(node.text);
  });

  // Search for field use relations in the abstract syntax tree (AST)
  tree.rootNode.descendantsOfType('member_access_expression').forEach((node) => {
    //check if its a field and not a method invocation
    if(node.parent.type != 'invocation_expression'){
      dependencies[relations.Uses].push(node.text);
    }
  });

  tree.rootNode.descendantsOfType('method_declaration').forEach((node) => {
    dependencies[relations.Calledby].push(node.text);
  });

  tree.rootNode.descendantsOfType('class_declaration').forEach((node) => {
    dependencies[relations.InstantiatedBy].push(node.text);
  });

  tree.rootNode.descendantsOfType('field_declaration').forEach((node) => {
    dependencies[relations.UsedBy].push(node.text);
  });

  class_heritage, call_expression, invocation_expression, element_access_expression, object_creation_expression
  method_declaration, class_declaration, field_declaration
  return dependencies;
}

// Function to build the dependency graph
function buildForest(directory) {
  const files = fs.readdirSync(directory);

  files.forEach((file) => {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      // If it's a directory, recursively analyze its contents
      buildForest(filePath);
    } else if (stats.isFile() && file.endsWith('.cs')) {
      // If it's a file, analyze it
      const tree = parseFile(filePath);
      forest.set(filePath, tree);
    }
  });
}

// Main function
async function main() {
  buildDependencyGraph(rootDirectory);

  // Print the dependency graph
  dependencyGraph.forEach((value, key) => {
    console.log(`File: ${key}`);
    console.log(`Imports: ${value[relations.Imports].join(', ')}`);
    console.log(`BaseClass: ${value[relations.BaseClassOf].join(', ')}`);
    console.log(`Calls: ${value[relations.Calls].join(', ')}`);
    console.log(`Uses: ${value[relations.Uses].join(', ')}`);
    console.log(`UsedBy: ${value[relations.UsedBy].join(', ')}`);
    console.log(`InstantiatedBy: ${value[relations.InstantiatedBy].join(', ')}`);
    console.log(`CalledBy: ${value[relations.Calledby].join(', ')}`);
  });

  //example run:
  // const oldBlock = dependencyGraph.get('TestFiles\\test2.cs')[relations.Calls][0]+";";
  
  // const prompt = "Modify the following C# codeblock to print \"testing\":\n" + oldBlock;

  // const newBlock = await wrapper(prompt); // Wait for the promise to complete
  // console.log(oldBlock + "\n\n");
  // console.log(newBlock.generated_text);

  // console.log("\n\n");
  // editFile('./TestFiles/test2.cs', oldBlock, newBlock.generated_text);
}

main();
