const GeminiClient = require("./gemini/geminiClient");
const { runLoop } = require("./loop");
const redAgentPrompt = require("./prompts/system/redAgent");
const createTools = require("./tools/registerTools");

require("dotenv").config();

console.log("starting ts");

function analyzeCode(){

}

const INPUTS = {
    dir: "",
    run: ""
};

function runMainLoop(input){
    return runLoop(new GeminiClient(), createTools(), {
        systemPrompt: redAgentPrompt(),
        prompt: "Start",
        messages: []
    });
}

(async () => {
    console.dir(await runMainLoop(INPUTS), {depth: 5});
})();

