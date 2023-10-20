import { HfInference } from "@huggingface/inference";

const inference = new HfInference('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');
const model = "bigscience/bloom";



async function wrapper(prompt){
    const result = await inference.textGeneration({
        inputs: prompt,
        model: model,
    });

    return result;
}

//
function editFile(file, oldBlock, newBlock){
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

// async function main() {
//     const p = "Say this is a test";
//     const result = await wrapper(p); // Wait for the promise to complete
//     console.log(result.generated_text);
// }

// main();