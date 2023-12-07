const Parser = require('tree-sitter');
const JavaScript = require('tree-sitter-javascript');
const CSharp = require('tree-sitter-c-sharp');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const { get } = require('http');

// const { HfInference } = require("@huggingface/inference");
// const { release } = require('os');

// //bloom api setup
// const inference = new HfInference('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');
// const model = "bigscience/bloom";

//openai api setup
const openai = new OpenAI({
    apiKey: '',
});

//parser setup
const parser = new Parser();
parser.setLanguage(CSharp);

// Define the directory to analyze
const rootDirectory = './TestFiles'; // Adjust this to your repository path

// initialize dependencyGraph and forest
var dependencyGraph = new Map();
var forest = new Map();

//variable for holding significant blocks which will later be used in the dependency graph
var hold = new Map();
//temporal context starts as an empty string that will upon as the program iterates
var temporalContext = [];

//Define the relation labels
//This helps keep the code neater
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

//queue implementation for plan graph
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

//define function to ensure code can easily be parsed 
//from gpt API response
functions = [
  {
    "name": "c-sharp_edit",
    "description": "Provides a block of C# code, or -1 if no changes are neccessary",
    "parameters": {
      "type": "object",
      "properties": {
        "code": {
          "type": "string",
          "description": "The C# code block based on the given prompt"
        }
      },
      "required": ["code"]
    }
  }
];

//initialize the plan graph
var planGraph = new Queue();

//returns codeblocks that may be impacted if a change is
//made in the given file
function changeMayImpact(file, oldBlock){

  //go through dependencies of changed file
  for(const relation in dependencyGraph.get(file).blocks){

    //check what the relation is to ensure correct parsing is used
    if(relation == [relations.Calledby]){
      for(var i = 0; i < dependencyGraph.get(file).blocks[relation].length; i++){
        var block = dependencyGraph.get(file).blocks[relation][i][1];
        //if it is a invocation, take only the method call
        if (block.includes('.')) {
          const parts = block.split('.');
          block = parts[1];
        }
        //get method name
        if(block.includes('(')){
          const parts = block.split('(');
          block = parts[0];
        }

        //check if the old block that was modified is the source of the current block
        if(oldBlock.includes(block)){
          //extend the plan graph
          planGraph.enqueue([dependencyGraph.get(file).blocks[relation][i][0], dependencyGraph.get(file).blocks[relation][i][1]]);
        }
      }
    }else if(relation == [relations.InstantiatedBy]){
      for(var i = 0; i < dependencyGraph.get(file).blocks[relation].length; i++){
        var block = dependencyGraph.get(file).blocks[relation][i][1];
        //remove new key word
        if(block.includes(' ')){
          const parts = block.split(' ');
          block = parts[1];
        }
        //get name of class
        if(block.includes('(')){
          const parts = block.split('(');
          block = parts[0];
        }

        if(oldBlock.includes(block)){
          planGraph.enqueue([dependencyGraph.get(file).blocks[relation][i][0], dependencyGraph.get(file).blocks[relation][i][1]]);
        }
      }
    }else if(relation == [relations.UsedBy]){
      for(var i = 0; i < dependencyGraph.get(file).blocks[relation].length; i++){
        var block = dependencyGraph.get(file).blocks[relation][i][1];

        //get variable name
        if(block.includes('.')){
          const parts = block.split('.');
          block = parts[1];
        }
        if(oldBlock.includes(block)){
          planGraph.enqueue([dependencyGraph.get(file).blocks[relation][i][0], dependencyGraph.get(file).blocks[relation][i][1]]);
        }
      }
    } 
  }  
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

//when an edit is made, forest needs to be updated
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
      //code can be declared and not used, so find relationships from instantiation, calling, etc.
      if(relation != [relations.Calledby] && relation != [relations.InstantiatedBy] && relation != [relations.UsedBy]){

        //loop through each array of code blocks
        for(var i = 0; i < value1.blocks[relation].length; i++){

          //go through each relation case to use proper regex in isOrigin()
          if(relation == [relations.Calls]){
            hold.forEach((value3, key3) => {
                for(const relation2 in value3.blocks){
                  //compare current block to every possible origin block based on node type
                  if(relation2 == [relations.Calledby]){
                    var origin = isOrigin(key3, value1.blocks[relation][i], 'm');
                    if(origin){
                      //graph is bidirectional
                      //we look for dependencies in codeblocks, not files
                      //this means a file can be dependent on its self  
                      dependencyGraph.get(key1).blocks[relation].push([key3, origin]);
                      dependencyGraph.get(key3).blocks[relation2].push([key1, value1.blocks[relation][i]]);
                    }
                  }
                }
            });
          }else if(relation == [relations.Instantiates]){
            hold.forEach((value3, key3) => {
                for(const relation2 in value3.blocks){
                  if(relation2 == [relations.InstantiatedBy]){
                    var origin = isOrigin(key3, value1.blocks[relation][i], 'o');
                    if(origin){
                      dependencyGraph.get(key1).blocks[relation].push([key3, origin]);
                      dependencyGraph.get(key3).blocks[relation2].push([key1, value1.blocks[relation][i]]);
                    }
                  }
                }
            });
          }else if (relation == [relations.Uses]){
            hold.forEach((value3, key3) => {
                for(const relation2 in value3.blocks){
                  if(relation2 == [relations.UsedBy]){
                    var origin = isOrigin(key3, value1.blocks[relation][i], 'u');
                    if(origin){
                      dependencyGraph.get(key1).blocks[relation].push([key3, origin]);
                      dependencyGraph.get(key3).blocks[relation2].push([key1, value1.blocks[relation][i]]);
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
      };
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
  const result = await openai.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "gpt-3.5-turbo",
    functions: functions,
    function_call: {'name':'c-sharp_edit'}
  });

  //get JSON response as a string
  var res = result.choices[0]["message"]["function_call"]["arguments"];
  //turn string into JSON
  res = JSON.parse(res);
  //return new block of code
  return res['code'];
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

    //make change in the file
    fs.writeFile(file, updatedContent, 'utf-8', (writeErr) => {
      if (writeErr) {
        console.error('Error writing to the file:', writeErr);
      } else {
        //console.log(`Function replaced with new function line by line.`);
      }
    });
  });
}

function isOrigin(file, block, type) {
    for (const relation in hold.get(file).blocks) {

      //path for finding origin of method call
      if (type == 'm' && relation == [relations.Calledby]) {
        for (var i = 0; i < hold.get(file).blocks[relation].length; i++) {

          //if an invocation, only take method name
          if (block.includes('.')) {
            const parts = block.split('.');
            block = parts[1];
          }
          //get method name
          if(block.includes('(')){
            const parts = block.split('(');
            block = parts[0];
          }
          
          //create regex
          const methodRegex = new RegExp(`${block}`);
          //ignore writeline call, main method, and then test regex
          if ( block != "WriteLine" && !hold.get(file).blocks[relation][i].includes("Main") && methodRegex.test(hold.get(file).blocks[relation][i])) {
            //return codeblock that is the origin of the method call
            return hold.get(file).blocks[relation][i];
          }
        }
      //path for finding origin of object instantiation
      } else if (type == 'o' && relation == [relations.InstantiatedBy]) {
        const originalBlock = block;
        for (var i = 0; i < hold.get(file).blocks[relation].length; i++) {
          
          //remove new keyword
          if(block.includes(' ')){
            const parts = block.split(' ');
            block = parts[1];
          }
          //get name of class
          if(block.includes('(')){
            const parts = block.split('(');
            block = parts[0];
          }
          
          const objectRegex = new RegExp(`${block}`);
          //search for class declaration
          if (objectRegex.test(hold.get(file).blocks[relation][i]) && !hold.get(file).blocks[relation][i].includes(originalBlock)) {
            return hold.get(file).blocks[relation][i];
          }
        }
      //path for finding origin of field use
      } else if (type == 'u' && relation == [relations.UsedBy]) {
        for (var i = 0; i < hold.get(file).blocks[relation].length; i++) {

          if(block.includes('.')){
            const parts = block.split('.');
            block = parts[1];
          }
          
          const useRegex = new RegExp(`\\w+\\s+${block}`);

          if (useRegex.test(hold.get(file).blocks[relation][i])) {
            return hold.get(file).blocks[relation][i];
          }
        }
      }
  }

  return false;
}

//get code blocks that may hold info on current file
function getSpatialContext(file){

  var ret = "";

  for(const relation in dependencyGraph.get(file).blocks){
    if(relation != [relations.InstantiatedBy] && relation != [relations.Calledby] && relation != [relation.UsedBy]){
      for(var i = 0; i < dependencyGraph.get(file).blocks[relation].length; i++){
        const temp = "File: " + dependencyGraph.get(file).blocks[relation][i][0] + ", Code Block: " + dependencyGraph.get(file).blocks[relation][i][1];
        ret+="\n" + temp;
      }
    }
  }

  return ret;

}

//format temporal context and return it
function getTemporalContext(){

  var ret = "";

  for(var i = 0; i < temporalContext.length; i++){
    ret += temporalContext[i];
  }

  return ret;
}

//make a prompt that contains context and the block that needs to be edited
function constructPrompt(file, oldBlock){

  //get spatial context
  const spatialContext = getSpatialContext(file);
  const tempContext = getTemporalContext();

  //make prompt
  var prompt = `
  Task: Your task is to analyze the following temporal and spatial context
  to make an edit on the following C# code. Based on the temporal and spatial
  context, the code you create must compile. For example, if the parameters of
  a method are edited in the temporal context, then the calls of that method
  must have the correct parameter types and amounts.

  Earlier Code Changes (Temporal Context): ${tempContext}

  Related Code (Spatial Context): ${spatialContext}

  Code to be edited:
  ${oldBlock}
  `;

  return prompt;
}

//make the initial edit
async function seedEdit(file, oldBlock, edit){

  //get spatial context
  const spatialContext = getSpatialContext(file);

  const intialPrompt = `
  Task: ${edit}

  Related Code (Spatial Context): ${spatialContext}

  Code to be edited:
  ${oldBlock}
  `
  const newBlock = await wrapper(intialPrompt);

  console.log("Original Block: " + oldBlock);
  console.log("New Block: " + newBlock + "\n");

  editFile(file, oldBlock, newBlock);
  changeMayImpact(file, oldBlock);

  //update temporal context
  const str = "File that was changed: " + file + "\nCode Block that was changed: " + oldBlock + "\nCode Block after change: " + newBlock + ",\n";
  temporalContext.push(str);
  
  //return value to make sure action is 
  //is completed in main before more code executes
  return 1;
}

async function derivedEdit(){
  const currentBlock = planGraph.dequeue();

  const oldBlock = currentBlock[1];

  var newBlock = await wrapper(constructPrompt(currentBlock[0], oldBlock));

  //update temporal context
  const str = "File that was changed: " + currentBlock[0] + "\nCode Block that was changed: " + oldBlock + "\nCode Block after change: " + newBlock + ",\n";
  temporalContext.push(str);

  console.log("Original Block: " + oldBlock);
  console.log("New Block: " + newBlock + "\n");
  
  //make in-file edit
  editFile(currentBlock[0], oldBlock, newBlock);
  //update syntax tree and forest
  updateForest(currentBlock[0]);
  //update what blocks are significant
  findSignificantBlocks(forest);
  //update plan queue
  changeMayImpact(currentBlock[0], oldBlock);
  //update depenedncy graph
  findRelationships(hold);

  //return value to make sure action is 
  //is completed in main before more code executes
  return 1;
}

//Main function
async function main() {
  buildForest(rootDirectory);
  findSignificantBlocks(forest);
  findRelationships(hold);

  const fileToEdit = `TestFiles\\test2.cs`;//Format: repository\file
  //the code block that you want to change
  const blockToEdit = `public static int check(){
    return 0;
  }`;
  //how do you want the above code block to change
  const editInstruction = `
  Modify the given C# method to take an int and return that parameter squared
  `;

 const syncingVar1 = await seedEdit(fileToEdit, blockToEdit, editInstruction);

  updateForest(fileToEdit);
  findSignificantBlocks(forest);
  findRelationships(hold);


  while(planGraph.length > 0){
    var syncingVar2 = derivedEdit();
  }
}

main();
