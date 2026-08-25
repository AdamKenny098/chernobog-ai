import {
  ChernobogLearningRuntime,
} from "./learningRuntime";

type LearningRuntimeGlobals =
  typeof globalThis & {
    __chernobogLearningRuntimePromise?:
      Promise<ChernobogLearningRuntime>;
  };

const learningGlobals =
  globalThis as LearningRuntimeGlobals;

export function getChernobogLearningRuntime():
  Promise<ChernobogLearningRuntime> {
  if (
    !learningGlobals
      .__chernobogLearningRuntimePromise
  ) {
    const startup =
      Promise.resolve()
        .then(async () => {
          const runtime =
            new ChernobogLearningRuntime();

          await runtime.initialize();

          return runtime;
        })
        .catch((error) => {
          delete learningGlobals
            .__chernobogLearningRuntimePromise;
          throw error;
        });

    learningGlobals
      .__chernobogLearningRuntimePromise =
      startup;
  }

  return learningGlobals
    .__chernobogLearningRuntimePromise;
}
