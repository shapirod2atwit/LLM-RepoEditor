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
var temporalContext = "";

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

//TODO need function calling llm 1st
const functions = [];

var planGraph = new Queue();

//returns codeblocks that may be impacted if a change is
//made in the given file
function changeMayImpact(oldBlock){
  dependencyGraph.forEach((value, key) => {
    for(const relation in value.blocks){
      if(relation != [relations.Calledby] && relation != [relations.InstantiatedBy] && relation != [relations.UsedBy]){
        for(var i = 0; i < relation.length; i++){
          if(oldBlock == relation[i][1]){
            planGraph.enqueue([key, relation[i][1]]);
          }
        }
      }
    }
  });
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

//when an edit is made, parse tree needs to be updated
function updateForest(filePath){
  const code = fs.readFileSync(filePath, 'utf-8');
  const tree = parser.parse(code);

  forest.set(filePath, tree);
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
                for(const relation2 in value3.blocks){
                  if(relation2 == [relations.Calledby]){
                    if(isOrigin(key3, relation[i], 'm')){
                      //graph is bidirectional
                      //we look for dependencies in codeblocks, not files
                      //this means a file can be dependent on its self  
                      dependencyGraph.get(key1).blocks[relation].push([key3, relation[i]]);
                      dependencyGraph.get(key3).blocks[relation2].push([key1, relation[i]]);
                    }
                  }
                }
            });
          }else if(relation == [relations.Instantiates]){
            hold.forEach((value3, key3) => {
                for(const relation2 in value3.blocks){
                  if(relation2 == [relations.InstantiatedBy]){
                    if(isOrigin(key3, relation[i], 'o')){
                      dependencyGraph.get(key1).blocks[relation].push([key3, relation[i]]);
                      dependencyGraph.get(key3).blocks[relation2].push([key1, relation[i]]);
                    }
                  }
                }
            });
          }else if (relation == [relations.Uses]){
            hold.forEach((value3, key3) => {
                for(const relation2 in value3.blocks){
                  if(relation2 == [relations.UsedBy]){
                    if(isOrigin(key3, relation[i], 'u')){
                      dependencyGraph.get(key1).blocks[relation].push([key3, relation[i]]);
                      dependencyGraph.get(key3).blocks[relation2].push([key1, relation[i]]);
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

//make in-file edits with the LLM response
function editFile(file, oldBlock, newBlock) {
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

  //update temporal context
  const str = "File that was changed: " + file + ", Code Block that was changed: " + oldBlock + ", Code Block after change: " + newBlock;
  temporalContext.concat("\n", str);
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

//get files that may hold info on current file
function getSpatialContext(file){

  var ret = "";

  const b = dependencyGraph.get(file).blocks;

  for(const relation in b){
    if(relation != [relations.InstantiatedBy] && relation != [relations.Calledby] && relation != [relation.UsedBy]){
      for(var i = 0; i < relation.length; i++){
        const temp = "File: " + relation[i][0] + ", Code Block" + relation[i][1];
        ret.concat("\n", temp);
      }
    }
  }

  return ret;

}

//TODO
function constructPrompt(file){

  //get spatial context
  const spatialContextArr = getSpatialContext(file);
  var spatialContext = "";
  if(spatialContextArr.length > 0){
    for(var i = 0; i < spatialContextArr.length; i++){
      spatialContext.concat("\n", spatialContextArr[i]);
    }
  }

  var fileContent;
  //get potentially impacted file as string
  try{
    fileContent = fs.readFileSync(file, 'utf-8');
  }catch (e){
    console.log(e);
  }

  //make prompt
  var prompt = `
  Task: Your task is to analyze the following temporal and spatial context
  to determine if the given code needs to be edited. All of the code provided is written in C#.
  If an edit is not neccessary, simply respond with -1.

  Earlier Code Changes (Temporal Context): ${temporalContext}

  Related Code (Spatial Context): ${spatialContext}

  Code to be edited:
  ${fileContent}

  PUT MORE HERE
  `;

  return prompt;
}

//make the initial edit
async function seedEdit(file, oldBlock, edit){

  //get spatial context
  const spatialContextArr = getSpatialContext(file);
  var spatialContext = "";
  if(spatialContextArr.length > 0){
    for(var i = 0; i < spatialContextArr.length; i++){
      spatialContext.concat("\n", spatialContextArr[i]);
    }
  }

  const intialPrompt = `
    INSERT LATER
  `
  const newBlock = await wrapper(intialPrompt);

  editFile(file, oldBlock, newBlock.generated_text);
  changeMayImpact(oldBlock);
}

function derivedEdit(){
  const currentBlock = planGraph.dequeue();

  const oldBlock = currentBlock[1];

  var newBlock = wrapper(constructPrompt(currentBlock[0]));
  editFile(currentBlock[0], oldBlock, newBlock);
  updateForest(currentBlock[0]);
  findSignificantBlocks(forest);
  changeMayImpact(oldBlock);
}

//parse function/class calls to ignore params
///
///
///

// Main function
async function main() {
  buildForest(rootDirectory);
  findSignificantBlocks(forest);
  findRelationships(hold);

  const fileToEdit = `TestFiles\\test2.cs`;//Format: repository\file
  const blockToEdit = `
  public void BaseMethod(){
    Console.WriteLine("base method");
  }
  `;
  const editInstruction = `
  Modify the given C# method 
  `;
  seedEdit(fileToEdit, blockToEdit, editInstruction)
  findRelationships()
  while(planGraph.length() > 0){
    derivedEdit();
  }

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
}

main();
