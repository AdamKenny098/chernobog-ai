import path from "node:path";

import {
  getMemories,
  getRecentMessages,
} from "../memory";
import {
  getSessionContext,
  resolveSessionId,
} from "../session/store";
import {
  ChernobogLearnedLessonStore,
} from "../learning/lessonStore";
import {
  createVaultMemoryStore,
} from "../../modules/vault-brain/memoryStore";
import {
  createProjectMemoryProfileStore,
} from "../../modules/vault-brain/projectProfileStore";
import {
  getV6PersonalIntelligenceSystemStatus,
} from "../../modules/vault-brain/personalIntelligenceOperatingLoop";
import type {
  UnifiedMemoryReaderMap,
} from "./readTypes";
import type {
  UnifiedMemoryRecord,
} from "./unifiedTypes";

const DEFAULT_LESSON_PATH = path.join(
  process.cwd(),
  ".chernobog",
  "learning",
  "lessons.json",
);

function cloneRecord(
  record: UnifiedMemoryRecord,
): UnifiedMemoryRecord {
  return structuredClone(record);
}

async function readLessons():
  Promise<UnifiedMemoryRecord[]> {
  const store =
    new ChernobogLearnedLessonStore();

  try {
    await store.load(
      DEFAULT_LESSON_PATH,
    );
  } catch (error) {
    if (
      (
        error as NodeJS.ErrnoException
      ).code === "ENOENT"
    ) {
      return [];
    }

    throw error;
  }

  return store
    .list({
      activeOnly: true,
    })
    .filter(
      (lesson) =>
        lesson.scope === "global" ||
        (
          lesson.scope === "project" &&
          Boolean(
            lesson.projectId?.trim(),
          )
        ),
    )
    .map((lesson) => {
      const projectId =
        lesson.scope === "project"
          ? lesson.projectId?.trim()
          : undefined;

      return cloneRecord({
        id:
          `lesson:${lesson.id}`,
        source:
          "learned-lessons",
        layer:
          "learned",
        scope:
          projectId
            ? "project"
            : "system",
        projectId,
        key:
          lesson.key,
        content:
          lesson.statement,
        createdAt:
          lesson.promotedAt,
        confidence:
          lesson.confidence,
        metadata: {
          kind:
            lesson.kind,
          lessonScope:
            lesson.scope,
          supportCount:
            lesson.supportCount,
          contradictionCount:
            lesson.contradictionCount,
          governance:
            lesson.governance,
        },
      });
    });
}

export function createDefaultUnifiedMemoryReaders():
  UnifiedMemoryReaderMap {
  return {
    "conversation-history":
      (query) => {
        const limit = Math.max(
          1,
          Math.min(
            100,
            query.limit ?? 20,
          ),
        );

        if (!query.sessionId) {
          return [];
        }

        return getRecentMessages(
          query.sessionId,
          limit,
        ).map(
          (message, index) =>
            cloneRecord({
              id:
                `conversation:${index}:${message.role}`,
              source:
                "conversation-history",
              layer:
                "short_term",
              scope:
                "conversation",
              content:
                `${message.role}: ${message.content}`,
              metadata: {
                role:
                  message.role,
                ordinal:
                  index,
              },
            }),
        );
      },

    "session-state":
      (query) => {
        const sessionId =
          resolveSessionId(
            query.sessionId,
          );

        const session =
          getSessionContext(
            sessionId,
          );

        return [
          cloneRecord({
            id:
              `session:${sessionId}`,
            source:
              "session-state",
            layer:
              "working",
            scope:
              "session",
            sessionId,
            content:
              JSON.stringify(
                session,
              ),
            updatedAt:
              session.lastUpdatedAt,
            metadata: {
              lastRoute:
                session.lastRoute,
              workflowKind:
                session.workflow
                  ?.kind,
            },
          }),
        ];
      },

    "durable-facts":
      (query) => {
        const limit = Math.max(
          1,
          Math.min(
            100,
            query.limit ?? 40,
          ),
        );

        return getMemories(limit).map(
          (fact, index) =>
            cloneRecord({
              id:
                `durable:${index}:${fact}`,
              source:
                "durable-facts",
              layer:
                "long_term",
              scope:
                "user",
              content:
                fact,
            }),
        );
      },

    "vault-structured-memory":
      async (query) => {
        const store =
          createVaultMemoryStore();

        const entries =
          await store.listEntries({
            statuses: [
              "approved",
            ],
            text:
              query.text,
            projectId:
              query.projectId,
            limit:
              query.limit,
          });

        return entries.map((entry) =>
          cloneRecord({
            id:
              `vault:${entry.id}`,
            source:
              "vault-structured-memory",
            layer:
              "long_term",
            scope:
              entry.projectId
                ? "project"
                : "system",
            projectId:
              entry.projectId,
            content:
              [
                entry.title,
                entry.body,
              ]
                .filter(Boolean)
                .join("\n"),
            createdAt:
              entry.createdAt,
            updatedAt:
              entry.updatedAt,
            confidence:
              entry.confidence,
            metadata: {
              memoryType:
                entry.memoryType,
              status:
                entry.status,
              source:
                entry.source,
              version:
                entry.version,
              tags:
                entry.tags,
              sourceRef:
                entry.sourceRef,
            },
          }),
        );
      },

    "project-memory-profile":
      async (query) => {
        const store =
          createProjectMemoryProfileStore();

        const selectedProfile =
          query.projectId
            ? await store.getProfile(
                query.projectId,
              )
            : undefined;

        const profiles =
          query.projectId
            ? selectedProfile
              ? [selectedProfile]
              : []
            : await store.listProfiles();

        const versions =
          await store.listVersions({
            projectId:
              query.projectId,
          });

        return [
          ...profiles.map((profile) =>
            cloneRecord({
              id:
                `project:${profile.projectId}`,
              source:
                "project-memory-profile",
              layer:
                "long_term",
              scope:
                "project",
              projectId:
                profile.projectId,
              key:
                profile.projectId,
              content:
                JSON.stringify(
                  profile,
                ),
              createdAt:
                profile.createdAt,
              updatedAt:
                profile.updatedAt,
              metadata: {
                kind:
                  "project-profile",
                status:
                  profile.status,
                tags:
                  profile.tags,
              },
            }),
          ),
          ...versions.map((version) =>
            cloneRecord({
              id:
                `project-version:${version.id}`,
              source:
                "project-memory-profile",
              layer:
                "long_term",
              scope:
                "project",
              projectId:
                version.projectId,
              key:
                version.version,
              content:
                JSON.stringify(
                  version,
                ),
              createdAt:
                version.createdAt,
              updatedAt:
                version.updatedAt,
              metadata: {
                kind:
                  "version-profile",
                status:
                  version.status,
                tags:
                  version.tags,
              },
            }),
          ),
        ];
      },

    "personal-intelligence":
      () => {
        const status =
          getV6PersonalIntelligenceSystemStatus();

        return [
          cloneRecord({
            id:
              "personal-intelligence:system-status",
            source:
              "personal-intelligence",
            layer:
              "long_term",
            scope:
              "system",
            key:
              "v6-personal-intelligence-status",
            content:
              JSON.stringify(
                status,
              ),
            updatedAt:
              status.generatedAt,
            metadata: {
              version:
                status.version,
              readinessOk:
                status.readinessOk,
              activeOperatingModel:
                status.activeOperatingModel,
            },
          }),
        ];
      },

    "learned-lessons":
      async () =>
        readLessons(),
  };
}
