// Inlined at the end of <body> when Umami is on. One capture-phase listener
// sends clicks on [data-track] elements (see trackAttrs) to Umami. Unlike
// Umami's own data-umami-event handling it never cancels the click, so CV
// downloads, client-side navigation and Lenis anchors behave as without
// analytics. Before Umami loads (first input) clicks are queued on
// window.__umamiQueue and flushed by umami-loader.ts. Umami's fetch uses keepalive, so a following page load doesn't
// drop the event.
export const trackingScript = `(function(){document.addEventListener("click",function(e){var t=e.target;var el=t&&t.closest?t.closest("[data-track]"):null;if(!el)return;var props={},n=0,a=el.attributes;for(var i=0;i<a.length;i++){var k=a[i].name;if(k.indexOf("data-track-")===0){props[k.slice(11)]=a[i].value;n++}}var name=el.getAttribute("data-track");var u=window.umami;try{if(!u||typeof u.track!=="function"){(window.__umamiQueue=window.__umamiQueue||[]).push([name,n?props:undefined])}else if(n)u.track(name,props);else u.track(name)}catch(err){}},true)})()`;
