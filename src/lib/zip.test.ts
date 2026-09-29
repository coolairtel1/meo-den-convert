import { describe, expect, it } from "vitest"
import { uniqueNames } from "./zip"

describe("uniqueNames", () => {
  it("numbers duplicates case-insensitively", () => {
    expect(uniqueNames(["a.jpg", "b.jpg", "A.jpg", "a.jpg", "noext", "noext"])).toEqual([
      "a.jpg",
      "b.jpg",
      "A (2).jpg",
      "a (3).jpg",
      "noext",
      "noext (2)",
    ])
  })
})
