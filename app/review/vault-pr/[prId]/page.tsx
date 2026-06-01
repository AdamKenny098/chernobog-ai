import type { VaultPullRequest } from "@/lib/modules/discord-ingest/types";
import { getVaultPullRequestById } from "@/lib/modules/discord-ingest/approval/pullRequestStore";
import { VaultPullRequestWorkspace } from "@/components/review/VaultPullRequestWorkSpace";

export const dynamic = "force-dynamic";

type VaultPullRequestPageProps = {
  params: Promise<{
    prId: string;
  }>;
};

function serializePullRequest(
  pullRequest: VaultPullRequest
): VaultPullRequest {
  return JSON.parse(JSON.stringify(pullRequest)) as VaultPullRequest;
}

export default async function VaultPullRequestPage({
  params,
}: VaultPullRequestPageProps) {
  const { prId } = await params;
  const decodedPrId = decodeURIComponent(prId);
  const pullRequest = getVaultPullRequestById(decodedPrId);

  if (!pullRequest) {
    return (
      <main className="min-h-screen bg-[#050506] text-zinc-100">
        <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-8">
          <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-500/80">
            Vault Review
          </p>

          <h1 className="text-3xl font-semibold tracking-tight">
            Pull request not found
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400">
            Chernobog could not find a vault pull request with the id{" "}
            <span className="font-mono text-zinc-200">{decodedPrId}</span>.
            If the dev server restarted, the in-memory pull request store was
            cleared. Run <span className="font-mono text-zinc-200">discord triage ideas</span>,
            then <span className="font-mono text-zinc-200">create vault pr from triage plan</span>{" "}
            again.
          </p>
        </div>
      </main>
    );
  }

  return <VaultPullRequestWorkspace pullRequest={serializePullRequest(pullRequest)} />;
}