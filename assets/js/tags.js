/* jj26 — tags. One registry for every taggable thing on the site, so a tag
   link always lands somewhere true. Add a project or Lab entry here when it
   ships; tags.html renders from this list (and search can later too). Card tag rows
   are written into the HTML so they work without JS — keep them in sync.
   Every tag must have at least one item — no decorative tags. */
window.JJ_TAGS = {
  "design-lead":    "Design Lead",
  "ux":             "UX",
  "ui":             "UI",
  "visual-design":  "Visual Design",
  "motion":         "Motion",
  "mobile":         "Mobile",
  "design-systems": "Design Systems",
  "agentic":        "Agentic Workflows",
  "front-end":      "Front-End"
};

window.JJ_ITEMS = [
  { kind: "Work", title: "Boulder Crest Foundation", url: "work/boulder-crest.html",
    meta: "Website · Webby Honoree 2024", tags: ["design-lead", "ux", "visual-design"] },
  { kind: "Work", title: "Action Against Hunger", url: "work/action-against-hunger.html",
    meta: "Website · W3 Gold 2023", tags: ["design-lead", "ux", "visual-design", "design-systems"] },
  { kind: "Work", title: "ALPA", url: "work/alpa-mobile-app.html",
    meta: "Mobile app", tags: ["design-lead", "ux", "ui", "mobile"] },
  { kind: "Work", title: "Moments Match", url: "work/ala-moments-match.html",
    meta: "American Lung Association · 30s spot", tags: ["design-lead", "motion"] },
  { kind: "Work", title: "ProLift Toyota", url: "work/prolift-toyota.html",
    meta: "Website", tags: ["design-lead", "ux", "visual-design"] },
  { kind: "Lab", title: "Design engineering workflow", url: "lab/design-engineering-workflow.html",
    meta: "Artifact · Stub", tags: ["agentic", "design-systems"] },
  { kind: "Lab", title: "Building Forge", url: "lab/building-forge.html",
    meta: "Artifact · Stub", tags: ["agentic"] },
  { kind: "Lab", title: "Slack for agents", url: "lab/slack-for-agents.html",
    meta: "Artifact · Draft", tags: ["agentic"] },
  { kind: "Lab", title: "Building this site with agents", url: "lab/building-this-site-with-agents.html",
    meta: "Artifact", tags: ["agentic", "front-end"] }
];
