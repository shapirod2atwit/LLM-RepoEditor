//make sure you run "npm install openai" in the terminal before running
const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: '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',
});

//function definition for getting the weather
//this gives a format for the LLM to contruct its message when using the function call
functions = [
    {
      "name": "c-sharp_edit",
      "description": "Provides a block of C# code, or -1 if no changes are neccessary",
      "parameters": {
        "type": "object",
        "properties": {
          "code": {
            "type": "string",
            "description": "The C# code block based on the given prompt."
          }
        },
        "required": ["code"]
      }
    }
  ];

async function wrapper(){

    // const prompt = `public void BaseMethod(){
    //     Console.WriteLine("base method");
    // }
    // Modify the given C# method to print "hello"
    // `;
    // const functionCall = await openai.chat.completions.create({
    //     messages: [{ role: "user", content: prompt }],
    //     model: "gpt-3.5-turbo",
    //     functions: functions,
    //     function_call: {'name':'c-sharp_edit'}
    // });

    // const msg = functionCall.choices[0]["message"]["function_call"];

    // var msg = '{\n' +
    // '"code": "public void BaseMethod(){\\n        Console.WriteLine(\\"hello\\");\\n    }"\n' +
    // '}';

    // var m = "";
    // for(var i=0;i<msg.length;i++){
    //   if(i > 10 && i < msg.length-3){
    //     m+=msg[i];
    //   }
    // }
    // m = m.replaceAll("\\n", "\n")
    // m = m.replaceAll("\\","")
    // msg= JSON.parse(msg)
    // console.log(msg['code']);

    var str = "";

    str += "\n "+"here";
    
    console.log(str);

    
}

wrapper();
