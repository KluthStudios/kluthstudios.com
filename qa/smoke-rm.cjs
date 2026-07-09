const fs=require("fs"); const {JSDOM}=require("jsdom");
const dom=new JSDOM(fs.readFileSync("dist/index.html","utf8"),{runScripts:"outside-only",pretendToBeVisual:true,url:"https://kluthstudios.com/"});
const {window}=dom;
window.matchMedia=q=>({matches:/reduce/.test(q),media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
let errs=[]; window.addEventListener("error",e=>errs.push(e.message));
["public/js/scene.js","public/js/main.js"].forEach(f=>{try{window.eval(fs.readFileSync(f,"utf8"))}catch(e){errs.push(f+": "+e.message)}});
window.document.dispatchEvent(new window.Event("DOMContentLoaded",{bubbles:true}));
setTimeout(()=>{
  const d=window.document, a=(c,m)=>c?console.log("  ✓ "+m):errs.push(m);
  a(d.getElementById("preloader").classList.contains("done"),"reduced-motion: preloader skipped");
  a(!d.body.classList.contains("is-loading"),"reduced-motion: body unlocked");
  a(d.getElementById("hero").classList.contains("is-in"),"reduced-motion: hero revealed");
  if(errs.length){errs.forEach(e=>console.error("  ✗ "+e));process.exit(1);}
  console.log("REDUCED-MOTION PASS"); process.exit(0);
},300);
