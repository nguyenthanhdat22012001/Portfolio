// Development only; HeroCanvas never imports this in production builds.
import { Perf } from "r3f-perf";

export default function PerfOverlay() {
  return <Perf position="top-left" />;
}
