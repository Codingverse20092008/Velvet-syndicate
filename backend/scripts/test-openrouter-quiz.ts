import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../../.env.local') });

async function testOpenRouter() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('Missing OPENROUTER_API_KEY in .env.local');
    return;
  }

  console.log('Sending request to OpenRouter using google/gemma-4-26b-a4b-it:free...');

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemma-4-26b-a4b-it:free",
        messages: [
          {
            role: "user",
            content: "Generate a batch of 3 streetwear/sneaker-themed multiple choice quiz questions. Return only a valid JSON array conforming to this structure: [{\"title\": \"Short Title\", \"prompt\": \"The question prompt\", \"options\": [\"Choice A\", \"Choice B\", \"Choice C\"], \"answerIndex\": 0}]. Do not include markdown code block formatting."
          }
        ]
      })
    });

    const data: any = await response.json();
    console.log('API Response status:', response.status);

    const content = data.choices?.[0]?.message?.content;
    if (content) {
      console.log('\n--- Generated Quizzes ---');
      console.log(content);
    } else {
      console.log('Failed to get content. Raw response:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('Error contacting OpenRouter:', error);
  }
}

testOpenRouter();
