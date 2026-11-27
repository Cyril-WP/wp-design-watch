# Which model judges the screens

Research, 27 Nov 2026. Question: should the judge be Claude, or is there an open-source model that is as accurate? And what is still unknown?

## Short answer

Claude judges, through Claude Code subagents. Open source does everything around the judge: capture, accessibility rules, pixel diffs, the iOS driver, screen parsing. The judge sits behind one interface so it can be swapped, and the swap is decided by our own evaluation set, not by papers.

## What the research says

### General UI understanding: Claude leads the general models, but a small trained model beats all of them

UXBench (CVPR 2026, mobile UX reasoning, 2,000 questions) average scores:

| Model | Kind | Score |
| --- | --- | --- |
| UI-UX 4B (Qwen3-VL-4B trained on UI/UX data) | open base, fine-tuned | 0.796 |
| Claude 4.5 Sonnet | proprietary | 0.655 |
| Claude 3.7 Sonnet | proprietary | 0.649 |
| Claude 4 Sonnet | proprietary | 0.624 |
| Qwen3-VL-Thinking 235B | open | 0.585 |
| Qwen3-VL 235B | open | 0.560 |
| Qwen2.5-VL 72B | open | 0.548 |
| MiMo-VL 7B | open | 0.544 |
| MiniCPM-V 4.5 8B | open | 0.509 |

GPT and Gemini scores are not stated in that table, and whether the 4B model's weights are released is not stated. The lesson is the gap: a 4B model trained on UI data beat every general model, including models 60 times its size.

### Predicting which design works better: every model is near chance

WiserUI-Bench (ACL 2026) shows models pairs of real A/B-tested designs and asks which one won:

- Chance is 50% per order and 25% when the answer must hold in both orders.
- Best single-order score: GPT-4o 60.1%. Best open: InternVL-2.5-38B 57.8%.
- Answer stable in both orders: GPT-5.1 33.3%, Claude 4.5 Sonnet 32.3%, InternVL-2.5-38B 34.6%. The authors call this near random.
- Strong position bias: o1 picked the second image 97.8% of the time.

No model, open or closed, can be trusted to say "this version is better for users".

### Pointing at things: models guess coordinates badly, ids fix it

Set-of-Mark prompting numbers the elements on a screenshot and asks the model to answer with an id instead of x and y. The SoM and OmniParser papers report much more reliable grounding this way. On the web the DOM already gives every element and its box; on iOS the accessibility tree does. The model never has to draw a box.

### Running an open model on our Mac

Qwen3-VL-8B in 4-bit through MLX (mlx-vlm, LM Studio or Ollama) is about a 5 to 6 GB download and needs roughly 12 GB of RAM to run. It fits a 16 GB Mac only when nothing else heavy is running, which on our machines is rarely true. Its UXBench class (8B) scores about 0.51, well under Claude.

### Cost

Claude through Claude Code subagents runs on the subscription we already pay for, with no API key, which is the team's rule. An open model costs memory, setup and accuracy instead.

## What this changes in the design

1. **Never ask "is this good" or "which is better".** Ask checkable questions per rule: is text cut off, do two elements overlap, does every action carry a word label, does the first screen show a listing. Each answer names the element id it is about.
2. **Taste comes from the designer, not the model.** The judge gets the team's rules and past verdicts as examples, and its agreement with the designer is measured on a graded set before any score is trusted.
3. **Boxes come from the page.** Set-of-Mark overlay with DOM or accessibility ids; the model returns ids.
4. **Comparisons run both ways.** Any before and after check shows both orders and keeps only verdicts that hold in both.
5. **Fine-tuning is the open-source path.** Once the teach loop has a few thousand graded examples, a small open model trained on them may beat the general models, as UXBench suggests, and run cheaply. Revisit then.

## Open source we use around the judge

| Tool | Job |
| --- | --- |
| Playwright | Web capture, roles from saved sessions, request interception for empty, error and slow states |
| axe-core | Accessibility rules (contrast, names, roles) as part of the detector |
| pixelmatch or odiff | Pixel gate: skip screens that did not change |
| Maestro | iOS simulator driving and the accessibility tree with element frames |
| OmniParser | Parsing screens with no usable DOM or accessibility tree (canvas, maps, video) into elements with ids |
| mlx-vlm with Qwen3-VL-8B | Optional cheap pre-filter, off by default, only if our eval shows it helps |

## Gaps still open

1. **Ground truth is small.** The taste file holds dozens of rules, not thousands of graded screens. The teach loop has to build the set, and scores are provisional until judge agreement is measured.
2. **Run-to-run noise.** Claude Code subagents do not expose temperature. Two passes and keeping what both see is the plan; the noise level is unmeasured.
3. **Unattended runs.** A nightly run needs a headless `claude -p` launched by the scheduler, a logged-in Claude Code and enough subscription headroom. Whether 300 screens a night fits the usage limits is unknown.
4. **Private data in screenshots.** Signed-in pages show buyer names, emails and phone numbers, and the screenshot goes to the judge. Mask those regions by selector before judging, and prefer fixture accounts.
5. **iOS has no computed styles.** Fonts, colours and sizes cannot be read the way the web detector reads them. Options: pixel analysis, or a debug build that reports styles.
6. **Moving and changing content.** Carousels, video, live prices and staging data that changes daily make false differences. Freeze motion, pause media, mask dynamic regions, use fixtures.
7. **Model updates move grades.** Record the judge model id with every run and rerun the graded set whenever it changes.
8. **No number for the model we would use.** The papers tested Claude 4.5 Sonnet; we would run Opus 5.5. Our own graded set is the only number that matters.
9. **Cost per screen is unmeasured.** Slice one of the plan measures tokens and minutes per judged screen.

## Sources

- [Reasoning for Mobile User Experience with Multimodal LLMs (UXBench), CVPR 2026](https://arxiv.org/html/2606.13192)
- [Do MLLMs Capture How Interfaces Guide User Behavior? (WiserUI-Bench), ACL 2026](https://arxiv.org/html/2505.05026v5)
- [Set-of-Mark Prompting](https://arxiv.org/pdf/2310.11441v2.pdf)
- [OmniParser for Pure Vision Based GUI Agent](https://arxiv.org/html/2408.00203v1)
- [ScreenSpot-Pro grounding benchmark](https://arxiv.org/html/2504.07981v1)
- [Qwen3-VL-8B MLX builds](https://huggingface.co/mlx-community/Qwen3-VL-8B-Instruct-4bit)
- [UICrit: screenshot critiques with boxes](https://arxiv.org/html/2407.08850v3)
