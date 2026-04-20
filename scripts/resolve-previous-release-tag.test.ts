import { describe, expect, it } from "vitest";

import { resolvePreviousReleaseTag } from "./resolve-previous-release-tag.ts";

describe("resolvePreviousReleaseTag", () => {
  it("treats four-part stable versions as stable releases", () => {
    expect(
      resolvePreviousReleaseTag("stable", "v0.0.20.1", [
        "v0.0.19",
        "v0.0.20",
        "v0.0.20.0",
        "v0.0.20.1",
      ]),
    ).toBe("v0.0.20.0");
  });

  it("keeps prerelease tags behind same-core stable patch releases", () => {
    expect(
      resolvePreviousReleaseTag("stable", "v0.0.20.1", [
        "v0.0.20.1-beta.1",
        "v0.0.20",
        "v0.0.20.0",
      ]),
    ).toBe("v0.0.20.1-beta.1");
  });

  it("still rejects malformed stable tags", () => {
    expect(() => resolvePreviousReleaseTag("stable", "v0.0", [])).toThrow(
      "Invalid stable release tag 'v0.0'.",
    );
  });
});
