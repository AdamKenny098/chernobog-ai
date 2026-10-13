# External Project Adapters

OH-1K1 establishes a public compatibility boundary between the Chernobog Core runtime and project/product implementations that still live under `lib/modules/**`.

Core may orchestrate these capabilities through this boundary, but must not name concrete `lib/modules/**` implementations directly. This package owns only compatibility adapters; it does not own project persistence or business state.
