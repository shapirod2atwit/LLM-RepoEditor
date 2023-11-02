const Parser = require('tree-sitter');
const JavaScript = require('tree-sitter-javascript');
const CSharp = require('tree-sitter-c-sharp');
const fs = require('fs');
const path = require('path');
const { HfInference } = require("@huggingface/inference");
const { release } = require('os');

//bloom api setup
const inference = new HfInference('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');
const model = "bigscience/bloom";

//parser setup
const parser = new Parser();
parser.setLanguage(CSharp);

// Define the directory to analyze
const rootDirectory = './TestFiles'; // Adjust this to your repository path

// initialize dependencyGraph and forest
var dependencyGraph = new Map();
var forest = new Map();
var hold = new Map();


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

//queue needed for plan
class Queue {
  constructor() {
    this.items = {};
    this.headIndex = 0;
    this.tailIndex = 0;
  }

  enqueue(item) {
    this.items[this.tailIndex] = item;
    this.tailIndex++;
  }

  dequeue() {
    const item = this.items[this.headIndex];
    delete this.items[this.headIndex];
    this.headIndex++;
    return item;
  }

  peek() {
    return this.items[this.headIndex];
  }

  get length() {
    return this.tailIndex - this.headIndex;
  }
}

//returns files that may be impacted if a change is
//made in the given file
function changeMayImapct(file){

}

// Function to build forest of ASTs
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

// Function to create AST
function parseFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf-8');
  const tree = parser.parse(code);

  return tree;
}

//used to find dependencies between files
function findRelationships(hold){

  //(key => file path) (value => object holding map)
  hold.forEach((value1, key1) => {
    //(key => relationship) (value => array of code blocks)
    for(const relation in value1.blocks){
      if(relation != [relations.Calledby] && relation != [relations.InstantiatedBy] && relation != [relations.UsedBy]){

        for(var i = 0; i < relation.length; i++){

          if(relation == [relations.Calls]){
            hold.forEach((value3, key3) => {
              //***implement case for key1 == key3 later in plan graph */
              if(key3 != key1){
                for(const relation2 in value3.blocks){
                  if(relation2 == [relations.Calledby]){
                    if(isOrigin(key3, relation[i], 'm')){
                      //graph is bidirectional
                      dependencyGraph.get(key1).blocks[relation].push(key3);
                      dependencyGraph.get(key3).block[relation2].push(key1);
                    }
                  }
                }
              }
            });
          }else if(relation == [relations.Instantiates]){
            hold.forEach((value3, key3) => {
              //***implement case for key1 == key3 later in plan graph */
              if(key3 != key1){
                for(const relation2 in value3.blocks){
                  if(relation2 == [relations.InstantiatedBy]){
                    if(isOrigin(key3, relation[i], 'm')){
                      dependencyGraph.get(key1).blocks[relation].push(key3);
                      dependencyGraph.get(key3).block[relation2].push(key1);
                    }
                  }
                }
              }
            });
          }else if (relation == [relations.Uses]){
            hold.forEach((value3, key3) => {
              //***implement case for key1 == key3 later in plan graph */
              if(key3 != key1){
                for(const relation2 in value3.blocks){
                  if(relation2 == [relations.UsedBy]){
                    if(isOrigin(key3, relation[i], 'm')){
                      dependencyGraph.get(key1).blocks[relation].push(key3);
                      dependencyGraph.get(key3).block[relation2].push(key1);
                    }
                  }
                }
              }
            });
          }
        }
      }
    }
  });  
}

//constructor for making obj that holds significant code blocks
function codeBlocks(){
  this.blocks = {
    [relations.Imports]: [],
    [relations.BaseClassOf]: [],
    [relations.Calls]: [],
    [relations.Calledby]: [],
    [relations.Uses]: [],
    [relations.UsedBy]: [],
    [relations.Instantiates]: [],
    [relations.InstantiatedBy]: [],
  };
}

//find all code blocks that are dependent & depended on
function findSignificantBlocks(forest){

  forest.forEach((value, key) => {
    hold.set(key, new codeBlocks());
    dependencyGraph.set(key, new codeBlocks());

    //****will add searches for more types once corresponding source nodes are found */
    // value.rootNode.descendantsOfType('import_statement').forEach((node) => {
    //   hold.get(key).blocks[relations.Imports].push(node.text);
    // });

    // value.rootNode.descendantsOfType('class_heritage').forEach((node) => {
    //   hold.get(key).blocks[relations.BaseClassOf].push(node.text);
    // });

    value.rootNode.descendantsOfType('call_expression').forEach((node) => {
      hold.get(key).blocks[relations.Calls].push(node.text);
    });

    value.rootNode.descendantsOfType('invocation_expression').forEach((node) => {
      hold.get(key).blocks[relations.Calls].push(node.text);
    });

    value.rootNode.descendantsOfType('method_declaration').forEach((node) => {
      hold.get(key).blocks[relations.Calledby].push(node.text);
    });

    value.rootNode.descendantsOfType('object_creation_expression').forEach((node) => {
      hold.get(key).blocks[relations.Instantiates].push(node.text);
    });

    value.rootNode.descendantsOfType('class_declaration').forEach((node) => {
      hold.get(key).blocks[relations.InstantiatedBy].push(node.text);
    });

    value.rootNode.descendantsOfType('member_access_expression').forEach((node) => {
      if(node.parent.type != 'invocation_expression'){
        hold.get(key).blocks[relations.Uses].push(node.text);
      }
    });

    value.rootNode.descendantsOfType('field_declaration').forEach((node) => { 
        hold.get(key).blocks[relations.UsedBy].push(node.text);
    });
  });

  // class_heritage, call_expression, invocation_expression, element_access_expression, object_creation_expression
  // method_declaration, class_declaration, field_declaration
}

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


//find if codeblock is in the file
function isOrigin(file, block, type){

  try{
    const fileContent = fs.readFileSync(file, 'utf-8');

    //method parse
    if(type == 'm'){
      //if an invocation, only take method name
      if(block.includes('.')){
        const parts = block.split('.');
        block = parts[1];
      }

      const methodRegex = new RegExp(`\\s+${block}\\s*\\(`);

      if (methodRegex.test(fileContent)) {
        return true;
      }

    //object parse
    }else if(type == 'o'){
      //eliminate new key word

      const objectRegex = new RegExp(`\\s+${block}\\s*\\(`);

      if (objectRegex.test(fileContent)) {
        return true;
      }

    //field use parse
    }else if(type =='u'){

      const parts = block.split('.');
      block = parts[1];

      const useRegex = new RegExp(`\\w+\\s+${block}`);

      if (useRegex.test(fileContent)) {
        return true;
      }
    }
    
    return false;
  }catch (e){
    console.log(e);
  }

}

// Main function
async function main() {
  buildForest(rootDirectory);
  findSignificantBlocks(forest);
  findRelationships(hold);

  // Print the dependency graph
  // dependencyGraph.forEach((value, key) => {
  //   console.log(`File: ${key}`);
  //   console.log(`Imports: ${value[relations.Imports].join(', ')}`);
  //   console.log(`BaseClass: ${value[relations.BaseClassOf].join(', ')}`);
  //   console.log(`Calls: ${value[relations.Calls].join(', ')}`);
  //   console.log(`Uses: ${value[relations.Uses].join(', ')}`);
  //   console.log(`UsedBy: ${value[relations.UsedBy].join(', ')}`);
  //   console.log(`InstantiatedBy: ${value[relations.InstantiatedBy].join(', ')}`);
  //   console.log(`CalledBy: ${value[relations.Calledby].join(', ')}`);
  // });

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
