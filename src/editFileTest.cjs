const fs = require('fs');

// Define the source file, old function, and new function content
const sourceFile = './TestFiles/test2.cs';
const oldFunction = `class BaseClass
{
    public void BaseMethod()
    {
        Console.WriteLine("BaseClass's BaseMethod");
    }
}
`;

const newFunction = `
function newFunction() {
  // Your replacement function code here
}
`;

fs.readFile(sourceFile, 'utf-8', (err, data) => {
  if (err) {
    console.error('Error reading the file:', err);
    return;
  }

  // Split the old function and new function into lines
  const oldLines = oldFunction.split('\n');
  const newLines = newFunction.split('\n');

  // Iterate through the lines in the file
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
        // Replace the old function with the new function
        lines.splice(i, oldLines.length, ...newLines);
        i += newLines.length - 1;
      }
    }
  }

  const updatedContent = lines.join('\n');

  fs.writeFile(sourceFile, updatedContent, 'utf-8', (writeErr) => {
    if (writeErr) {
      console.error('Error writing to the file:', writeErr);
    } else {
      console.log(`Function replaced with new function line by line.`);
    }
  });
});
