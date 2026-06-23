import { parseYouTubePlaylistId } from "./parseYouTubePlaylistId";
import { YouTubePlaylistIngestRequest } from "./types";
import { fetchYouTubePlaylistDump } from "./youtubeClient";
import { writeYouTubePlaylistDumpToVault } from "./vaultWriter";

export async function ingestYouTubePlaylist(
  request: YouTubePlaylistIngestRequest
) {
  const playlistId = parseYouTubePlaylistId(request.playlist);
  const dump = await fetchYouTubePlaylistDump(playlistId);

  return writeYouTubePlaylistDumpToVault({
    dump,
    projectId: request.projectId,
    tags: request.tags,
  });
}