/**
 * After `next export`, duplicate the site under /sheet-plan/ so the
 * custom domain can load prefixed assets, and add a root hop page that
 * sends bearcublodge.com/ → /sheet-plan/ without breaking github.io
 * (where / already *is* the app).
 */
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const out = join(process.cwd(), "out");
if (!existsSync(out)) {
  console.error("pages-postbuild: out/ missing");
  process.exit(1);
}

writeFileSync(join(out, ".nojekyll"), "");
writeFileSync(join(out, "CNAME"), "bearcublodge.com\n");

const nested = join(out, "sheet-plan");
mkdirSync(nested, { recursive: true });

for (const name of ["_next", "mail", "floor", "staff"]) {
  const src = join(out, name);
  if (existsSync(src)) {
    cpSync(src, join(nested, name), { recursive: true });
  }
}

for (const name of ["index.html", "robots.txt", ".nojekyll"]) {
  const src = join(out, name);
  if (existsSync(src)) {
    cpSync(src, join(nested, name));
  }
}

const hop = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Sheet Plan</title>
  <meta name="robots" content="noindex,nofollow" />
  <script>
    (function () {
      var host = location.hostname.toLowerCase();
      var custom = host === "bearcublodge.com" || host === "www.bearcublodge.com";
      if (custom && location.pathname === "/") {
        location.replace("/sheet-plan/" + location.search + location.hash);
      }
    })();
  </script>
</head>
<body>
  <p><a href="./">Sheet Plan</a> · <a href="./mail/">Mail Advisor</a></p>
</body>
</html>
`;

// Do not replace github.io index.html — that *is* the app.
// Write a marker the custom-domain copy can use; the live index stays the export.
writeFileSync(join(out, "custom-domain-hop.html"), hop);

const indexPath = join(out, "index.html");
if (existsSync(indexPath)) {
  const html = readFileSync(indexPath, "utf8");
  const inject = `<script>(function(){var h=location.hostname.toLowerCase();if((h==="bearcublodge.com"||h==="www.bearcublodge.com")&&location.pathname==="/"){location.replace("/sheet-plan/"+location.search+location.hash);}})();</script>`;
  if (!html.includes("bearcublodge.com") || !html.includes("location.replace")) {
    const next = html.replace("<head>", `<head>${inject}`);
    writeFileSync(indexPath, next);
  }
}

console.log("pages-postbuild: CNAME, .nojekyll, /sheet-plan copy, custom-domain hop");
