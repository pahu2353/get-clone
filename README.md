https://github.com/user-attachments/assets/aa8ad92a-e796-47ce-9dfa-a6c8d907e1f9

## Installation Instructions
In the frontend folder, run:

```
npm i
npm run dev
```

In the backend folder:

Create an .env file with the following API keys:
```
ELEVENLABS_API_KEY=XXX
OPENAI_API_KEY=XXX
GOOEY_API_KEY=XXX
```

Then run:
```
pipenv shell
pipenv install
uvicorn app:app --reload --log-level debug
export GOOEY_API_KEY=XXX
```

## nwHacks 2025 Best Use of GenAI Winner :trophy:
Check out our submission on Devpost!
https://devpost.com/software/get-clone

## Inspiration ⚙️
We first came up with this idea when thinking about how cool it would be to have the opportunity to talk to yourself. We wanted to build something personable and speedy, allowing people not familiar with the latest tech trends to become interested in AI. We think that there’s countless applications of this technology, whether that be in sales, hospitals, or elderly homes.

## What it does 🤖
Get Clone is an app that creates a digital clone of yourself in under a minute. Enter your name, a few sentences about yourself, and a quick video/audio recording, and then watch as your virtual twin comes to life! It speaks, talks, and acts like you, and even has a little bit of your personality.

## How we built it 💻
Our frontend was built with Next.js and Python FastAPI was used for our backend. We leveraged OpenAI’s Whisper model to create a data pipeline that transcribes vocal input, transforms it into text, communicates with OpenAI’s ChatGPT API, and returns the text through ElevenLabs, which is used to clone the user’s voice. We then used Gooey.AI’s Lipsync model to couple the returned text with a training video.

## Challenges we ran into 🔥
We initially wanted to run this project completely locally, using whisper.cpp, llama.cpp, and a metahuman render in Unreal Engine. However, we soon found that our hardware was not powerful enough to run these models as smoothly as we wished. We had to quickly pivot to other solutions like OpenAI, Elevenlabs, and Gooey.AI.

## Accomplishments that we're proud of 🗿
We found ourselves in a critical dilemma late into the hackathon, and in fact almost abandoned this idea after suffering some setbacks (e.g., our hardware not being powerful enough to render the Unreal Engine Metahumans, or to run Nvidia’s audio2face). A late-night team meeting reaffirmed our desire to make this project, and we couldn’t be happier. We were able to find a way around our hurdles and complete what we first set out to do. We’re definitely proud of our perseverance and resilience to challenges.

## What we learned 😎
We learned that you don’t need the perfect idea to make a successful product. Any idea works as long as you continuously strive to find ways to bring that idea into fruition. We also learned to conquer our challenges and not be scared of failure. We almost gave up on this project halfway through to pursue easier, but we’re so happy that we ended up going through with this project.

## What's next for Get Clone 👾
We wish to expand on how familiar our clone is with a user’s personality and habits to make them even more effective and personal. We also would love to explore a completely open-source, locally-hosted version of this project, using tools like whisper.cpp and llama.cpp.
