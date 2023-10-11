const fs = require('fs');
const path = require('path');
const dependencyTree = require('dependency-tree');

const directoryPath = './'; // Adjust this to the path of your local repository
const entryFile = 'program.js'; // Adjust this to your entry file

// Function to list all JavaScript files in the directory
function listJavaScriptFiles(directory) {
  const files = fs.readdirSync(directory);
  return files.filter((file) => file.endsWith('.js'));
}

// Function to generate a dependency tree
function generateDependencyTree(entryFile) {
  return dependencyTree({
    filename: path.join(directoryPath, entryFile),
    directory: directoryPath,
  });
}

// Entry point
const jsFiles = listJavaScriptFiles(directoryPath);
const dependencyTreeData = generateDependencyTree(entryFile);

console.log(dependencyTreeData);
