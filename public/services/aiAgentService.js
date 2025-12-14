const { xai } = require('@ai-sdk/xai');
const { OpenAI } = require('openai');
const fs = require('fs')
const mammoth = require("mammoth");

const client = new OpenAI({
    apiKey: process.env.XAI_API_KEY,
    baseURL: 'https://api.x.ai/v1',
});

async function getResponse() {
    try {
        const completion = await client.chat.completions.create({
            model: 'grok-4', // or 'grok-3' depending on your access
            messages: [
                {
                    role: 'system',
                    content: 'You are Grok, a helpful and intelligent AI assistant.',
                },
                {
                    role: 'user',
                    content: 'What is the meaning of life, the universe, and everything?',
                },
            ],
            temperature: 0.7,
            max_tokens: 500,
        });

        // Correct way to get the response text
        console.log(completion.choices[0].message.content);
        return completion.choices[0].message.content;

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

async function getResponseWithFiles(files){

}

function filePreprocessingTxt(filePath) {
    const buffer = fs.readFileSync(filePath);
    const text = buffer.toString("utf8");

    const lines = text.split(/\r?\n/);

    // first non-empty line = title (heuristic)
    const title = lines.find(line => line.trim().length > 0) || null;

    return {
        title,
        pages: null, // txt does not have pages
        lines: lines.map((t, i) => ({ line: i + 1, text: t })),
        fullText: text
    };
}


async function filePreprocessingDocx(filePath) {
    // mammoth.extractRawText gives clean text without formatting
    // mammoth.convertToHtml gives structure, so we combine both
    const { value: html } = await mammoth.convertToHtml({ path: filePath });
    const { value: rawText } = await mammoth.extractRawText({ path: filePath });

    const lines = rawText.split(/\r?\n/).map(t => t.trim());
    const nonEmptyLines = lines.filter(t => t.length > 0);

    const htmlTitleMatch = html.match(/<h[1-6]>(.*?)<\/h[1-6]>/i);
    const title = htmlTitleMatch ? htmlTitleMatch[1] : (nonEmptyLines[0] || null);

    const headingRegex = /<h([1-6])>(.*?)<\/h\1>/gi;
    const headings = [];
    let match;
    while ((match = headingRegex.exec(html)) !== null) {
        headings.push({
            level: Number(match[1]),
            text: match[2]
        });
    }

    const paragraphs = nonEmptyLines.map((text, idx) => ({
        paragraph: idx + 1,
        text
    }));

    return {
        title,
        headings,
        pages: null, // DOCX has no pages without layout engine
        paragraphs,
        fullText: rawText
    };
}

async function test() {
    const result = await filePreprocessingDocx("test.docx");
    console.log(result);
}

test()


