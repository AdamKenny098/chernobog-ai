# @chernobog/core

OH-1H public boundary for the accepted general Chernobog runtime.

This slice is deliberately conservative:

- accepted implementations remain under `lib/chernobog/**` as a temporary compatibility/source-verification mirror;
- server/API and non-Core library consumers may import through `@chernobog/core/*`;
- `components/**` is not migrated in OH-1H and remains for OH-1I;
- external project implementation debt remains for OH-1K;
- extracted Events, Tools, Trust, Models, Vault, Prompts and Personal Assistance boundaries remain separate.
