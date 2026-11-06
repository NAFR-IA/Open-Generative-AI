# OGA Professional Zero Cost — phase 1

## Non-negotiable constraints
- **No spending**: do not sign up for paid cloud infrastructure, make billable API calls, or enable automatic top-ups.
- **No hidden uploads**: reference images and prompts remain on the device until the user explicitly chooses to upload them on a third-party website.
- **No false availability claims**: public free GPU capacity and usage quotas can change; opening a Space does not guarantee a generation.
- **No imitation of paid models**: free open-weight models cannot be assumed to match closed commercial results.

## Phase 1 — implemented in this branch
A curated allowlisted provider registry in `electron/lib/freeCloudProviders.js`, available through the Electron preload bridge. OGA can list these destinations and open them in the external browser. **This is a handoff, not an automated image/video API.** It involves no billing API or model download.

Initial destination: official Hugging Face ZeroGPU Space discovery list.
Free accounts currently receive 5 GPU minutes per day; queueing and model-specific restrictions apply. See https://huggingface.co/docs/hub/spaces-zerogpu

## Phase 2 — pending
- Add an explicit zero-cost cloud panel in Image Studio and Video Studio, using the bridge methods.
- Let users choose trusted Spaces after verifying a live Space's API schema, author permissions, input types and commercial license.
- Implement isolated adapters with opt-in consent for uploading prompt/reference media and quota-aware errors.
- Keep DreamShaper 8 local and functional; preserve local/remote toggles.

## Phase 3 — pending
- QA benchmark: repeatable reference-driven editing, photographic realism, consistency and export quality.
- Video: test one freely accessible Space end-to-end; no guaranteed continuous GPU service.
- Verify licensing for each model, including commercial use.

## Run tests
```bash
node --test tests/freeCloudProviders.test.js
```

This module has no third-party runtime dependencies.

## Manual project-to-cloud workflow
1. Open Image Studio or Video Studio and prepare the prompt.
2. Click `☁ Gratis 0 €`. The modal reads only the currently visible studio prompt into an editable text area.
3. Click `Copiar texto al portapapeles` to copy via Electron clipboard; this is a local operation and does not send the prompt to providers.
4. Open a curated free demo, paste the prompt and upload the reference image manually **only after reviewing the Space's policies**.
5. If commercial rights are required, do not use Qwen Image 2.1 research-only outputs without permission; verify other model/Space terms individually.

The new clipboard operation rejects prompts over 12,000 characters. ZeroGPU can rate-limit users; access to a demo does not constitute a guarantee of generation. A direct in-app cloud generation adapter is **not yet implemented**.
