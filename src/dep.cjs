const fs = require('fs');
const path = require('path');

// Define a function to parse C# source files and extract class and method dependencies.
function parseCSharpFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const dependencies = new Map();

  // Regular expressions to match class definitions and method invocations.
  const classRegex = /class\s+(\w+)\s+/g;
  const methodRegex = /(\w+)\.\s*(\w+)\(/g;

  // Extract class definitions.
  let match;
  while ((match = classRegex.exec(content))) {
    const className = match[1];
    dependencies.set(className, new Set());
  }

  // Extract method invocations.
  while ((match = methodRegex.exec(content))) {
    const callerClass = path.basename(filePath, path.extname(filePath));
    const calleeMethod = match[2];
    const calleeClass = match[1];

    if (dependencies.has(callerClass) && dependencies.has(calleeClass)) {
      dependencies.get(callerClass).add(calleeClass);
    }
  }

  return dependencies;
}

// Function to create a dependency graph.
function createDependencyGraph(rootDir) {
  const graph = new Map();

  // Read all C# files in the given directory.
  const files = fs.readdirSync(rootDir).filter(file => file.endsWith('.cs'));

  files.forEach(file => {
    const filePath = path.join(rootDir, file);
    const fileName = path.basename(file, path.extname(file));
    graph.set(fileName, parseCSharpFile(filePath));
  });

  return graph;
}

// Replace 'yourLocalCSharpRepoPath' with the path to your C# repository.
const repoPath = './TestFiles';

// Generate the dependency graph.
const dependencyGraph = createDependencyGraph(repoPath);

// Print the dependency graph (for demonstration purposes).
for (const [fileName, dependencies] of dependencyGraph.entries()) {
  console.log(`File: ${fileName}`);
  for (const [className, dependentClasses] of dependencies.entries()) {
    console.log(`  - ${className} depends on: ${Array.from(dependentClasses).join(', ')}`);
  }
  console.log();
}
