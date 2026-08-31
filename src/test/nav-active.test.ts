import { describe, expect, it } from "vitest";
import { navActive } from "@/lib/nav-active";

const HREFS = ["/", "/mail/", "/floor/", "/floor/wide/"];

describe("navActive", () => {
  it("marks Planner only on the home path", () => {
    expect(navActive("/", "/", HREFS)).toBe(true);
    expect(navActive("", "/", HREFS)).toBe(true);
    expect(navActive("/mail/", "/", HREFS)).toBe(false);
    expect(navActive("/floor/", "/", HREFS)).toBe(false);
  });

  it("does not let Floor steal /floor/wide/", () => {
    expect(navActive("/floor/wide/", "/floor/", HREFS)).toBe(false);
    expect(navActive("/floor/wide/", "/floor/wide/", HREFS)).toBe(true);
    expect(navActive("/floor/", "/floor/", HREFS)).toBe(true);
    expect(navActive("/floor/", "/floor/wide/", HREFS)).toBe(false);
  });

  it("activates Mail Advisor only on /mail/", () => {
    expect(navActive("/mail/", "/mail/", HREFS)).toBe(true);
    expect(navActive("/mail", "/mail/", HREFS)).toBe(true);
    expect(navActive("/", "/mail/", HREFS)).toBe(false);
  });
});
