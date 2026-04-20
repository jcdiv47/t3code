import { describe, expect, it } from "vitest";

import { resolvePreviousReleaseTag } from "./resolve-previous-release-tag.ts";

describe("resolvePreviousReleaseTag", () => {
  it("treats t3 fork patch prereleases as part of the stable release lineage", () => {
    expect(
      resolvePreviousReleaseTag("stable", "v0.0.21-t3.2", [
        "v0.0.19",
        "v0.0.20",
        "v0.0.21-t3.1",
        "v0.0.21-t3.2",
      ]),
    ).toBe("v0.0.21-t3.1");
  });

  it("keeps prerelease tags behind same-core stable patch releases", () => {
    expect(
      resolvePreviousReleaseTag("stable", "v0.0.21-t3.1", [
        "v0.0.21-beta.1",
        "v0.0.20",
        "v0.0.21-alpha.1",
      ]),
    ).toBe("v0.0.21-beta.1");
  });

  it("still rejects malformed stable tags", () => {
    expect(() => resolvePreviousReleaseTag("stable", "v0.0", [])).toThrow(
      "Invalid stable release tag 'v0.0'.",
    );
  });
});
