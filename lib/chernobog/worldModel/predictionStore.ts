import type {
  WorldModelStatePrediction,
} from "./predictionTypes";

function clonePrediction(
  prediction:
    WorldModelStatePrediction,
): WorldModelStatePrediction {
  return structuredClone(
    prediction,
  );
}

export class ChernobogWorldModelPredictionStore {
  private readonly predictions =
    new Map<
      string,
      WorldModelStatePrediction
    >();

  upsert(
    prediction:
      WorldModelStatePrediction,
  ): WorldModelStatePrediction {
    this.predictions.set(
      prediction.id,
      clonePrediction(
        prediction,
      ),
    );

    return clonePrediction(
      prediction,
    );
  }

  get(
    id: string,
  ):
    | WorldModelStatePrediction
    | undefined {
    const prediction =
      this.predictions.get(id);

    return prediction
      ? clonePrediction(
          prediction,
        )
      : undefined;
  }

  list():
    WorldModelStatePrediction[] {
    return [
      ...this.predictions.values(),
    ]
      .sort(
        (left, right) =>
          left.generatedAt.localeCompare(
            right.generatedAt,
          ) ||
          left.id.localeCompare(
            right.id,
          ),
      )
      .map(
        clonePrediction,
      );
  }

  clear(): void {
    this.predictions.clear();
  }
}
