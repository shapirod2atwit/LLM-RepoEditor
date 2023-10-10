const Parser = require('tree-sitter');
const JavaScript = require('tree-sitter-javascript');
const fs = require('fs');
const path = require('path');

const parser = new Parser();
parser.setLanguage(JavaScript);

//arr to store all abstract syntax trees
var ASTs = [];

//put the path to the repository here
const target = "./src";

// Loop through all the files in the directory
fs.readdir(target, async function (err, files) {
  if (err) {
    console.error("Could not list the directory.", err);
    process.exit(1);
  }

  files.forEach(function (file, index) {
    //make complete path of file
    var currentPath = path.join(target, file);
    var type = path.extname(currentPath);

    fs.stat(currentPath, function (error, stat) {
      if (error) {
        console.error("Error stating file.", error);
        return;
      }

      if (stat.isFile() && type==".js"){
        //conver file to string
        var sourceCode = fs.readFileSync(currentPath).toString();
        //create ast and push ast array
        ASTs.push(parser.parse(sourceCode));
        console.log("'%s' AST has been added to AST list.", currentPath);
        
      }
    });
  });
});
