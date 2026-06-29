/* eslint-disable @typescript-eslint/no-require-imports */
﻿const fs = require("fs");

const file = "./imports/tiktok-export/user_data_tiktok.json";
const raw = fs.readFileSync(file, "utf8");

const urlMatches =
  raw.match(/https?:\/\/(?:www\.)?(?:tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com)\/[^"\\\s<>{}]+/gi) ?? [];

const uniqueUrls = [...new Set(urlMatches.map((url) => url.replace(/[),.]+$/g, "")))];

console.log("TikTok URLs found:", uniqueUrls.length);

const data = JSON.parse(raw);

function scan(value, path = "<root>", depth = 0) {
  if (depth > 8 || value == null) {
    return;
  }

  if (Array.isArray(value)) {
    const lowPath = path.toLowerCase();

    if (/(favorite|favourite|like|video|history|activity|link|saved)/.test(lowPath)) {
      console.log(`${path}: array(${value.length})`);
    }

    if (value.length > 0) {
      scan(value[0], `${path}[0]`, depth + 1);
    }

    return;
  }

  if (typeof value !== "object") {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    const nextPath = path === "<root>" ? key : `${path}.${key}`;
    const lowPath = nextPath.toLowerCase();

    if (/(favorite|favourite|like|video|history|activity|link|saved)/.test(lowPath)) {
      if (Array.isArray(child)) {
        console.log(`${nextPath}: array(${child.length})`);
      } else if (child && typeof child === "object") {
        console.log(`${nextPath}: object`);
      } else {
        console.log(`${nextPath}: ${typeof child}`);
      }
    }

    scan(child, nextPath, depth + 1);
  }
}

scan(data);
