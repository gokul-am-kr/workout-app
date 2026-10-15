# Platewise Pulse
Mobile-first meal and workout tracking PWA. Includes AI food-photo estimation and voice exercise logging.

## Deploy on Render
Build command: `npm install`; start command: `npm start`. Set `OPENAI_API_KEY`, `APP_USERNAME`, `APP_PASSWORD` (min 16 characters), `MONTHLY_AI_BUDGET_USD=5` in Render environment variables. Do NOT commit secrets.

## Install on iPhone
Open HTTPS Render URL in Safari, Share > Add to Home Screen. Data is stored in this browser only. Body-fat, photo nutrition and training calculations are estimates. API spending limit is an estimate, not an enforced OpenAI billing cap.
