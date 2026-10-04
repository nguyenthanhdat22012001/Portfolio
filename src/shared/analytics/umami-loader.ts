import { UMAMI_SCRIPT_SRC } from "./config";

// Inlined at the end of <body> when Umami is on. Loads Umami's script on the
// first input, the same events and no-idle rule as shared/animation/
// load-trigger.ts: Lighthouse counts third-party scripts in
// resource-summary:script:size and never gives input, so it never loads this.
// Clicks made before the script arrives wait in window.__umamiQueue
// (see tracking-script.ts) and are flushed on its load.
export function umamiLoaderScript(config: {
  websiteId: string;
  domains: string;
}): string {
  return `(function(){var ev=["scroll","pointermove","keydown","touchstart"];function fire(){for(var i=0;i<ev.length;i++)window.removeEventListener(ev[i],fire);var s=document.createElement("script");s.src=${JSON.stringify(UMAMI_SCRIPT_SRC)};s.defer=true;s.setAttribute("data-website-id",${JSON.stringify(config.websiteId)});s.setAttribute("data-domains",${JSON.stringify(config.domains)});s.setAttribute("data-do-not-track","true");s.addEventListener("load",function(){var q=window.__umamiQueue,u=window.umami;window.__umamiQueue=[];if(!q||!u||typeof u.track!=="function")return;for(var j=0;j<q.length;j++){try{if(q[j][1])u.track(q[j][0],q[j][1]);else u.track(q[j][0])}catch(err){}}});document.body.appendChild(s)}for(var i=0;i<ev.length;i++)window.addEventListener(ev[i],fire,{passive:true})})()`;
}
