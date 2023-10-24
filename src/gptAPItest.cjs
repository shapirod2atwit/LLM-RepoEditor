//make sure you run "npm install openai" in the terminal before running
const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: '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',
});

//function definition for getting the weather
//this gives a format for the LLM to contruct its message when using the function call
functions = [
    {
      "name": "get_current_weather",
      "description": "Get the current weather in a given location",
      "parameters": {
        "type": "object",
        "properties": {
          "latitude": {
            "type": "string",
            "description": "The latitude of the given city, e.g. 42.3601 for Boston, MA"
          },
          "longitude": {
            "type": "string",
            "description": "The longitude of the given city, e.g. -71.0589 for Boston, MA"
          }
        },
        "required": ["latitude","longitude"]
      }
    }
  ];

async function wrapper(){
    const functionCall = await openai.chat.completions.create({
        messages: [{ role: "user", content: "What is the weather like in Boston?" }],//ask a weather related question
        model: "gpt-3.5-turbo",
        functions: functions,
        function_call: {'name':'get_current_weather'}//this tells the llm to use the get_current_weather function. set to "auto" when using multiple functions
    });

    const apiKey = 'a1a2c423365724a24b3739ca7842651e'; // Replace with your OpenWeather API key
    //parse for lat and long coords from LLM response
    const cityObject = functionCall.choices[0]["message"]["function_call"]["arguments"];
    const argumentsJSON = JSON.parse(cityObject);
    const latitude = argumentsJSON.latitude;
    const longitude = argumentsJSON.longitude;

    console.log("Here is the result of the first LLM call with function calling when asked \"What is the weather like in Boston?\":\n"+cityObject+"\n");

    //construct url for weather api call using 
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}`;


    try{
      //make a weather API call using the lat and long coords obtained from first LLM call
      const response = await fetch(apiUrl);
      const data = await response.json();

      console.log("Here is what the weather API returned using information from the LLM: \n"+JSON.stringify(data)+"\n");

      //construct LLM prompt
      const summmary = "Use the JSON below to answer the following question: \"What is the weather like in Boston?\"\n"+JSON.stringify(data);

      //make another LLM call to summarize the data from the Weather API call
      const answer = await openai.chat.completions.create({
        messages: [{ role: "user", content: summmary }],
        model: "gpt-3.5-turbo",
        functions: functions,
        function_call: "none"//we want the answer to the original question now, so do not use funciton calls
      });

      console.log("Here is the LLMs answer when prompted to answer \"What is the weather like in Boston?\" using the JSON from the weather API");
      console.log(answer.choices[0]["message"]);
    }catch (e){
      console.error('Error:', error);
    }
    
}

wrapper();
