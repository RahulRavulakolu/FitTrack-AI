# Free local AI

Food-photo estimates, routine generation and the assistant run on the computer hosting FitTrack, through **Ollama + Qwen3-VL 2B Instruct**. The phone downloads neither Ollama nor the model. No LLM API key, paid AI subscription or paid inference endpoint is used. Local computation still uses your computer's memory, power and GPU/CPU; initial downloads need internet.

## Windows setup

For an always-on Azure VM that works while the laptop is off, use [AZURE.md](AZURE.md). "Local" means the model runs on the same host as the FitTrack API; that host can be the Azure VM. The model has no API fees, but Azure compute/storage consumes credit or incurs hosting charges. The cloud package has not been deployed yet.

1. Run `Setup-Free-AI.cmd` once. It downloads the official Ollama portable runtime (about 1.6 GB), verifies its SHA-256 checksum, starts it hidden and downloads `qwen3-vl:2b-instruct` (about 1.9 GB). Files live under `.data/ollama`; no model files are bundled into the APK or source ZIP.
2. Run `Start-FitTrack-Server.cmd`. It starts local AI if installed, then starts the backend or reports an already running backend. Keep the server computer on and reachable from your phone.
3. Install the updated Android APK over the existing app. Open Nutrition and scan a food photo, or ask the assistant. Local AI is enabled by default; **Profile → Privacy & AI** can disable it for your account.

Ollama listens only on `127.0.0.1:11434`. The launcher sets `OLLAMA_NO_CLOUD=1`, a 4096-token context and one simultaneous model request. FitTrack rejects remote inference addresses and cloud model names. Photos and prompts go to the selected FitTrack server computer, then to its local model; they are not sent to a paid LLM. If cloud photo storage is separately configured, the saved photo's storage policy still applies.

The recommended model fits modest laptop hardware. On this machine, Ollama detected an NVIDIA RTX 2050 with 4 GB VRAM. Initial model loading can take longer than later requests. The UI allows about three minutes for a local response and prevents overlapping inference. Model estimates can be wrong, especially for hidden ingredients and portions; review the editable food values before saving.

## Configuration

Set these on the backend computer only; the defaults work without a `.env` file:

```dotenv
LOCAL_AI_ENABLED=true
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_VISION_MODEL=qwen3-vl:2b-instruct
OLLAMA_TEXT_MODEL=qwen3-vl:2b-instruct
```

On macOS/Linux, install Ollama from its official distribution, set `OLLAMA_NO_CLOUD=1` for the server process, start `ollama serve` and run `ollama pull qwen3-vl:2b-instruct`. Use the same FitTrack configuration. Docker requires Ollama reachable on loopback within the API's network namespace; the provided standalone web container does not include a multi-gigabyte model. The Render starter blueprint disables local AI. A host with adequate memory/GPU running both services is required if you move off this laptop.

## Troubleshooting

- **Local service unavailable:** run `Start-FitTrack-Server.cmd`; inspect `.data/ollama/server.err.log`. The server remains usable for manual tracking while the model is stopped.
- **Model not downloaded:** run `Setup-Free-AI.cmd` again; Ollama resumes verified model downloads.
- **No step records:** Health Connect is separate from the LLM. Grant step permission and make sure a supported phone/app/watch is contributing steps.
- **Request takes too long:** retry after the model finishes loading; close memory-heavy apps. No fabricated estimate is returned on failure.
- **Disable/stop:** turn off local AI in your account, or stop the Ollama process whose PID is in `.data/ollama/server.pid` after verifying it is still that process. The application never falls back to paid inference.

References: [Ollama](https://ollama.com), [Qwen3-VL model](https://ollama.com/library/qwen3-vl:2b-instruct), [Ollama local-only configuration](https://docs.ollama.com/faq), [Android step aggregation](https://developer.android.com/health-and-fitness/health-connect/features/steps). Review the bundled model/runtime licenses for redistribution; the setup downloads official artifacts instead of embedding them in the phone app.
