const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: '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',
});

async function wrapper(){
    const chatCompletion = await openai.chat.completions.create({
        messages: [{ role: "user", content: "Say this is a test" }],
        model: "gpt-3.5-turbo",
    });
    return chatCompletion;
}

wrapper().then(result =>{
    console.log(result.choices[0].message.content);
}).catch(e => {
    console.log(e);
});
