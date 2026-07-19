export class CharacterProjectValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CharacterProjectValidationError";
  }
}

export class CharacterProjectStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CharacterProjectStateError";
  }
}

export class CharacterConceptGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CharacterConceptGenerationError";
  }
}

export class CharacterCanonicalPoseGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CharacterCanonicalPoseGenerationError";
  }
}

export class CharacterModelGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CharacterModelGenerationError";
  }
}
