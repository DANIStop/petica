import { describe, expect, it } from "vitest";
import { distanceKm, isValidGuesses, locationPoints, scorePhoto, scoreRound, yearPoints } from "./scoring";
import { shareText } from "./share";
import { parseYear, toCandidate, toRounds, type CommonsPage } from "./commons";

describe("udaljenost i bodovi", () => {
  it("Zagreb–Split ≈ 255 km", () => {
    const km = distanceKm({ lat: 45.815, lng: 15.982 }, { lat: 43.508, lng: 16.44 });
    expect(km).toBeGreaterThan(250);
    expect(km).toBeLessThan(262);
  });
  it("točno mjesto i godina = 100", () => {
    const a = { lat: 45.8, lng: 16, year: 1950 };
    expect(scorePhoto(a, a)).toMatchObject({ km: 0, points: 100 });
  });
  it("bodovi opadaju s udaljenošću i razlikom godina", () => {
    expect(locationPoints(0)).toBe(50);
    expect(locationPoints(1000)).toBe(18);
    expect(locationPoints(10000)).toBe(0);
    expect(yearPoints(0)).toBe(50);
    expect(yearPoints(-10)).toBe(40);
    expect(yearPoints(100)).toBe(0);
  });
  it("zbraja rundu do 500", () => {
    const a = { lat: 10, lng: 10, year: 1900 };
    expect(scoreRound(Array(5).fill(a), Array(5).fill(a)).total).toBe(500);
  });
});

describe("validacija", () => {
  const ok = { lat: 45, lng: 16, year: 1960 };
  it("prihvaća 5 valjanih nagađanja", () => expect(isValidGuesses(Array(5).fill(ok))).toBe(true));
  it("odbija izvan raspona i necijelu godinu", () => {
    expect(isValidGuesses(Array(5).fill({ ...ok, lat: 91 }))).toBe(false);
    expect(isValidGuesses(Array(5).fill({ ...ok, lng: NaN }))).toBe(false);
    expect(isValidGuesses(Array(5).fill({ ...ok, year: 1960.5 }))).toBe(false);
    expect(isValidGuesses(Array(5).fill({ ...ok, year: 3000 }))).toBe(false);
    expect(isValidGuesses(Array(4).fill(ok))).toBe(false);
  });
});

describe("share", () => {
  it("boje po fotografiji", () => {
    expect(shareText("2026-10-21", [100, 60, 10, 85, 0])).toBe("Petica · Kad i gdje #1 · 255/500 🟩🟨🟥🟩🟥");
  });
});

describe("Commons", () => {
  const page = (over: Record<string, string | undefined> = {}, coords = true): CommonsPage => ({
    title: "File:X.jpg",
    coordinates: coords ? [{ lat: 45.81, lon: 15.98 }] : undefined,
    imageinfo: [
      {
        thumburl: "https://upload.wikimedia.org/x.jpg",
        descriptionurl: "https://commons.wikimedia.org/wiki/File:X.jpg",
        extmetadata: {
          LicenseShortName: { value: over.license ?? "CC BY-SA 4.0" },
          Artist: { value: over.artist ?? '<a href="//x">Ivo <b>Horvat</b></a>' },
          DateTimeOriginal: { value: over.date ?? "1925" },
        },
      },
    ],
  });

  it("parseYear traži jednu jasnu godinu", () => {
    expect(parseYear("<time>1925-04-02</time>")).toBe(1925);
    expect(parseYear("circa 1930")).toBe(1930);
    expect(parseYear("1920–1930")).toBeNull();
    expect(parseYear("nepoznato")).toBeNull();
    expect(parseYear("2999")).toBeNull();
  });
  it("prihvaća valjanu sliku i čisti HTML iz autora", () => {
    const c = toCandidate(page())!;
    expect(c.year).toBe(1925);
    expect(c.photo.author).toBe("Ivo Horvat");
    expect(c.lng).toBe(15.98);
  });
  it("odbija nedopuštene licence, bez koordinata i bez autora", () => {
    expect(toCandidate(page({ license: "CC BY-NC 4.0" }))).toBeNull();
    expect(toCandidate(page({ license: "CC BY-ND 2.0" }))).toBeNull();
    expect(toCandidate(page({ license: "All rights reserved" }))).toBeNull();
    expect(toCandidate(page({}, false))).toBeNull();
    expect(toCandidate(page({ artist: "" }))).toBeNull();
  });
  it("javno vlasništvo može bez autora", () => {
    expect(toCandidate(page({ license: "Public domain", artist: "" }))?.photo.author).toBe("nepoznat autor");
  });
  it("grupira u runde od 5", () => {
    const cs = Array.from({ length: 11 }, () => toCandidate(page())!);
    const rounds = toRounds(cs);
    expect(rounds).toHaveLength(2);
    expect(rounds[0].payload.photos).toHaveLength(5);
    expect(rounds[0].answer.answers[0]).toEqual({ lat: 45.81, lng: 15.98, year: 1925 });
  });
});
