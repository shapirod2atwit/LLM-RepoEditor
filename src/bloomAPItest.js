import { HfInference } from "@huggingface/inference";

const inference = new HfInference('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');
const model = "bigscience/bloom";

const result = await inference.textGeneration({
    inputs: "Say this is a test",
    model: model,
});

console.log(result.generated_text);