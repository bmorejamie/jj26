/* jj26 — tags. One registry for every taggable thing on the site, so a tag
   link always lands somewhere true. Add a project or Lab entry here when it
   ships; tags.html renders from this list (and search can later too). Card tag rows
   are written into the HTML so they work without JS — keep them in sync.
   Every tag must have at least one item — no decorative tags. */
window.JJ_TAGS = {
  "ux":             "UX",
  "ui":             "UI",
  "visual-design":  "Visual Design",
  "motion":         "Motion",
  "editing":        "Editing",
  "kinetic-type":   "Kinetic Type",
  "compositing":    "Compositing",
  "mobile":         "Mobile",
  "design-systems": "Design Systems",
  "agentic":        "Agentic Workflows",
  "front-end":      "Front-End"
};

window.JJ_ITEMS = [
  { kind: "Work", title: "Boulder Crest Foundation", url: "work/boulder-crest.html",
    meta: "Website · Webby Honoree 2024", tags: ["ux", "ui", "visual-design"] },
  { kind: "Work", title: "Action Against Hunger", url: "work/action-against-hunger.html",
    meta: "Website · W3 Gold 2023", tags: ["ux", "ui", "visual-design", "design-systems"] },
  { kind: "Work", title: "ALPA", url: "work/alpa-mobile-app.html",
    meta: "Mobile app", tags: ["ux", "ui", "mobile"] },
  { kind: "Work", title: "Moments Match", url: "work/ala-moments-match.html",
    meta: "American Lung Association · 30s spot", tags: ["motion", "editing", "kinetic-type"] },
  { kind: "Work", title: "Special Olympics", url: "work/so-ctv.html",
    meta: "Monthly giving · 15s & 30s spots", tags: ["motion", "editing", "compositing"] },
  { kind: "Work", title: "ProLift Toyota", url: "work/prolift-toyota.html",
    meta: "Website", tags: ["ux", "ui", "visual-design"] },
  { kind: "Lab", title: "Slack for agents", url: "lab/slack-for-agents.html",
    meta: "Artifact", tags: ["agentic"] },
  { kind: "Lab", title: "Building this site with agents", url: "lab/building-this-site-with-agents.html",
    meta: "Artifact", tags: ["agentic", "front-end"] }
];
