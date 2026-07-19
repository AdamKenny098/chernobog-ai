export const STAGE_B_RSS_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Stage B Horror Feed</title>
    <link>https://itch.io/games/newest/tag-horror</link>
    <description>Fixture feed for Chernobog Game Radar.</description>
    <item>
      <title>Night Hall</title>
      <link>http://omen-games.itch.io/night-hall?utm_source=rss#top</link>
      <guid isPermaLink="true">https://omen-games.itch.io/night-hall</guid>
      <dc:creator>Omen Games</dc:creator>
      <description><![CDATA[<p>An atmospheric first-person hotel horror game.</p>]]></description>
      <pubDate>Tue, 16 Jun 2026 20:00:00 GMT</pubDate>
      <category>Horror</category>
      <category>Atmospheric</category>
    </item>
    <item>
      <title>Night Hall duplicate listing</title>
      <link>https://omen-games.itch.io/night-hall?ref=duplicate</link>
      <guid>night-hall-duplicate-guid</guid>
      <description>Duplicate canonical URL that should be rejected.</description>
    </item>
    <item>
      <title>Frozen Signal &amp; The Long Dark</title>
      <link>https://polar-lab.itch.io/frozen-signal?source=feed&amp;campaign=test</link>
      <guid>frozen-signal-v1</guid>
      <description><![CDATA[A cold survival horror prototype.]]></description>
      <pubDate>Mon, 15 Jun 2026 10:30:00 GMT</pubDate>
      <category>Survival Horror</category>
      <category>First Person</category>
    </item>
    <item>
      <title>External Listing</title>
      <link>https://example.com/not-an-itch-project</link>
      <guid>external-item</guid>
      <description>This entry must be rejected by the host allowlist.</description>
    </item>
  </channel>
</rss>`;
