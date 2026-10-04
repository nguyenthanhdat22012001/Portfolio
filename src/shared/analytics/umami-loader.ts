import { UMAMI_SCRIPT_SRC } from "./config";

// Inlined at the end of <body> when Umami is on. Loads Umami's script on the
// first input, the events of shared/animation/load-trigger.ts plus
// pointerdown and click (a screen reader's virtual cursor activates links
// with a click alone). No idle trigger: Lighthouse counts third-party
// scripts in resource-summary:script:size and never scrolls, moves, types,
// touches or clicks, so it never loads this. Clicks made before the script
// arrives wait in window.__umamiQueue (see tracking-script.ts) and are
// flushed on its load. data-exclude-hash: in-page anchors pushState their
// hash (hash-links.ts), and Umami would count each as a pageview.
export function umamiLoaderScript(config: {
  websiteId: string;
  domains: string;
}): string {
  return `(function(){var ev=["scroll","pointermove","pointerdown","keydown","touchstart","click"];function fire(){for(var i=0;i<ev.length;i++)window.removeEventListener(ev[i],fire);var s=document.createElement("script");s.src=${JSON.stringify(UMAMI_SCRIPT_SRC)};s.defer=true;s.setAttribute("data-website-id",${JSON.stringify(config.websiteId)});s.setAttribute("data-domains",${JSON.stringify(config.domains)});s.setAttribute("data-do-not-track","true");s.setAttribute("data-exclude-hash","true");s.addEventListener("load",function(){var q=window.__umamiQueue,u=window.umami;window.__umamiQueue=[];if(!q||!u||typeof u.track!=="function")return;for(var j=0;j<q.length;j++){try{if(q[j][1])u.track(q[j][0],q[j][1]);else u.track(q[j][0])}catch(err){}}});document.body.appendChild(s)}for(var i=0;i<ev.length;i++)window.addEventListener(ev[i],fire,{passive:true})})()`;
}
