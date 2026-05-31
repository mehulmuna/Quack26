const GeminiClient = require("./gemini/geminiClient");
const { runLoop } = require("./loop");
const redAgentPrompt = require("./prompts/system/redAgent");
const createTools = require("./tools/registerTools");
const { startToxiproxy } = require("./toxiproxy/start");

require("dotenv").config();

console.log("starting ts");

function analyzeCode(){

}

const INPUTS = {
    name: "liftlog",
    dir: "C:/Users/adria/source/repos/osu/swe/goofygoobers",
    run: {
        "backend": "npm start",
        "frontend": "npm start"
    }
};

async function runMainLoop(input){

    await startToxiproxy();

    runLoop(new GeminiClient(), createTools(input), {
        prompt: redAgentPrompt(input),
        maxTurns: 10,
        maxToolTurns: 10,
        out: (result) => {
            console.log("\n=== TURN RESULT ===");
            console.log(result.text);
        }
    })
    .then((result) => {
        console.log("\n=== FINAL ===");
        console.log(result.text);
    })
    .catch(console.error);
}

(async () => {
    console.dir(await runMainLoop(INPUTS), {depth: 5});
})();

