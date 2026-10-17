# T02 placement validation

Current displayed width, length, position and rotation are checked against the modeled setback ring and estimated existing house. Coverage remains independent. Empty/inverted envelopes, concave boundary crossings, malformed rings, unknown obstacles, house overlap, and boundary contact have distinct outcomes. A 90-degree alternative is a separate command and cannot clear the displayed pose.

`validatePlacement` returns status, envelope/house status, signed clearances, reasons and a rotated alternative. `describePlacement` provides shared scene/Check/report wording. `getScenePlacement` is the parcel/config/pose adapter. `summarizeFeasibility` accepts this same result and downgrades an otherwise positive summary when placement needs review or is blocked.

Tolerance is 0.01 feet; boundary contact within tolerance requires review for the house and is accepted for envelope containment. No municipal building-separation rule is invented. Polygon geometry and house position remain estimates, not survey evidence.

Validation: 19 focused placement/site-fit/verdict tests passed; TypeScript and focused ESLint passed. Runtime integration is owned by Codex and remains pending. T01 dependency files are included in this isolated worktree. Claude started the module; Codex completed and reviewed it after the provider limit, as Andrew authorized. No commit, push, merge, or deployment.
