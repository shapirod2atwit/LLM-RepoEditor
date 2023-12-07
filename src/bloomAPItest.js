import { HfInference } from "@huggingface/inference";
import { relative } from "path";
import * as fs from "fs";

const inference = new HfInference('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');
const model = "bigscience/bloom";



async function wrapper(prompt) {
  const result = await inference.textGeneration({
    inputs: prompt,
    model: model,
  });

  return result;
}

//
function editFile(file, oldBlock, newBlock) {
  fs.readFile(file, 'utf-8', (err, data) => {
    if (err) {
      console.error('Error reading the file:', err);
      return;
    }

    // Split the old block and new block into lines
    const oldLines = oldBlock.split('\n');
    const newLines = newBlock.split('\n');

    // Iterate through the lines in the file and find exact match
    const lines = data.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === oldLines[0].trim()) {
        let match = true;
        for (let j = 1; j < oldLines.length; j++) {
          if (!lines[i + j] || lines[i + j].trim() !== oldLines[j].trim()) {
            match = false;
            break;
          }
        }

        if (match) {
          // Replace the old block with the new block
          lines.splice(i, oldLines.length, ...newLines);
          i += newLines.length - 1;
        }
      }
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

function codeBlocks() {
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

function replaceCodeBlockInFile(filePath, oldCodeBlock, newCodeBlock) {
  try {
    // Read the content of the file
    let fileContent = fs.readFileSync(filePath, 'utf-8');

    // Remove whitespace from both old and new code blocks
    const formattedOldCodeBlock = oldCodeBlock.replace(/\s/g, '');
    const formattedNewCodeBlock = newCodeBlock.replace(/\s/g, '');

    // Replace the old code block with the new code block
    fileContent = fileContent.replace(/\s/g, '');
    fileContent = fileContent.replace(formattedOldCodeBlock, formattedNewCodeBlock);

    // Write the updated content back to the file
    fs.writeFileSync(filePath, fileContent, 'utf-8');

    console.log('Code block replaced successfully.');
  } catch (error) {
    console.error('Error reading/writing the file:', error);
  }
}

function tt(a){

  return a+a;
}

async function main() {
  // const p = "Say this is a test";
  // var a = 1;
  // console.log(a)
  // const result = await wrapper(p); // Wait for the promise to complete
  // console.log(result.generated_text);
  // a = tt(a)
  // console.log(a)
  

  var b = new Map();
  var a = new codeBlocks();
  a.blocks[relations.Imports].push(['a', 'b']);
  a.blocks[relations.Imports].push(['c', 'd']);
  b.set('key', a);

  b.forEach((value1, key1) => {
    for(const key in value1.blocks){
      if(key == 'Imports')
        console.log(`${key} : ${value1.blocks[key][0][0]}`)
    }
  });

  // const filePath = './src/test.cjs'; // Provide the path to your file
  // const oldCodeBlock = `
  //   function oldFunction() {
  //     console.log('Old function');
  //   }
  //   `; // Replace with the old code block you want to replace
  // const newCodeBlock = `
  //   function newFunction() {
  //     console.log('New function');
  //   }
  //   `; // Replace with the new code block

  // replaceCodeBlockInFile(filePath, oldCodeBlock, newCodeBlock);

}

main();