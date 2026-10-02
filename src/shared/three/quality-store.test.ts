import { beforeEach, describe, expect, it } from "vitest";
import type { TierEnv } from "./detect-tier";
import { qualityStore } from "./quality-store";

const strong: TierEnv = { finePointer: true, cores: 8 };
const weak: TierEnv = { finePointer: true, cores: 4 };

beforeEach(() => qualityStore.setState({ level: null }));

describe("qualityStore", () => {
  it("detects once; the first caller wins", () => {
    expect(qualityStore.getState().init(strong)).toBe("high");
    expect(qualityStore.getState().init(weak)).toBe("high");
    expect(qualityStore.getState().level).toBe("high");
  });

  it("steps High → Medium → Low and stays at Low", () => {
    qualityStore.getState().init(strong);
    qualityStore.getState().downgrade();
    expect(qualityStore.getState().level).toBe("medium");
    qualityStore.getState().downgrade();
    expect(qualityStore.getState().level).toBe("low");
    qualityStore.getState().downgrade();
    expect(qualityStore.getState().level).toBe("low");
  });

  it("never upgrades: init after a downgrade returns the current level", () => {
    qualityStore.getState().init(strong);
    qualityStore.getState().downgrade();
    expect(qualityStore.getState().init(strong)).toBe("medium");
  });

  it("downgrade before init does nothing", () => {
    qualityStore.getState().downgrade();
    expect(qualityStore.getState().level).toBeNull();
  });
});
