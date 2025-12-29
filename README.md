# AI Live Translator

A real-time speech translation system operating entirely locally. This project integrates a Chrome Extension frontend with a Python-based AI backend to provide live captioning for both microphone input and system audio (e.g., video conferences, streams).

## 🎥 Demonstração do Projeto

<p align="center">
  <a href="https://www.youtube.com/watch?v=ewmPrWxRrt8" target="_blank">
    <img src="https://img.youtube.com/vi/ewmPrWxRrt8/0.jpg" alt="Demonstração do Projeto" width="600">
  </a>
</p>

## Overview

This tool facilitates removing language barriers in virtual meetings by capturing audio streams directly from the browser tab or the user's microphone. It processes audio chunks through a local API gateway, performs speech-to-text (ASR), translates the content, and projects the result as a floating overlay on the user's screen.

## Key Features

- **Dual Source Capture:** Supports audio capture from both the user's microphone and system audio via the `chrome.tabCapture` API.
- **Local Processing:** Ensures data privacy by running OpenAI Whisper and Helsinki-NLP models locally.
- **Live Captioning:** Implements a streaming logic to process audio segments every 4 seconds for near real-time feedback.
- **Modern UI:** Injected DOM overlay with a glassmorphism design and non-intrusive controls.
- **Text-to-Speech:** Synthesized audio output of the translated text.

## Technical Stack

- **Frontend:** Google Chrome Extension (Manifest V3), JavaScript, CSS3.
- **Backend:** Python, FastAPI.
- **AI/ML:**
  - **ASR:** OpenAI Whisper (Base model).
  - **Translation:** HuggingFace Transformers (Helsinki-NLP Opus-MT).
