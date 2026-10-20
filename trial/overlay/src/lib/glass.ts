/** Cached, CPU-rendered glass. Based on Tigris LiquidGlass (MIT); no per-frame filters. */
export function boxBlur (data: Uint8ClampedArray, width: number, height: number, radius: number): void {
 const temp = new Uint8ClampedArray(data.length);
 const pass = (src: Uint8ClampedArray, dst: Uint8ClampedArray, horizontal: boolean) => {
  const outer = horizontal ? height : width; const inner = horizontal ? width : height; const span = radius*2+1;
  for (let a=0;a<outer;a++) {
   const at = (b: number) => (horizontal ? a*width+Math.max(0,Math.min(inner-1,b)) : Math.max(0,Math.min(inner-1,b))*width+a)*4;
   const sums=[0,0,0]; for (let b=-radius;b<=radius;b++) { const i=at(b); for(let c=0;c<3;c++)sums[c]+=src[i+c]; }
   for (let b=0;b<inner;b++) { const i=at(b); for(let c=0;c<3;c++){dst[i+c]=sums[c]/span;sums[c]+=src[at(b+radius+1)+c]-src[at(b-radius)+c];} dst[i+3]=255; }
  }
 };
 pass(data,temp,true);pass(temp,data,false);
}
function canvas (width: number,height: number): [HTMLCanvasElement,CanvasRenderingContext2D] {
 const c=document.createElement('canvas');c.width=width;c.height=height;const ctx=c.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');return [c,ctx];
}
export function bakeBackdrop (image: HTMLImageElement): {blur: string; dock: string} {
 const [c,ctx]=canvas(480,270); const scale=Math.max(480/image.naturalWidth,270/image.naturalHeight);
 ctx.drawImage(image,(480-image.naturalWidth*scale)/2,(270-image.naturalHeight*scale)/2,image.naturalWidth*scale,image.naturalHeight*scale);
 const original=ctx.getImageData(0,0,480,270);
 const soft=new Uint8ClampedArray(original.data);boxBlur(soft,480,270,7);boxBlur(soft,480,270,7);
 ctx.putImageData(new ImageData(soft,480,270),0,0); const blur=c.toDataURL('image/jpeg',0.9);
 const glass=new Uint8ClampedArray(original.data);boxBlur(glass,480,270,3);boxBlur(glass,480,270,3);
 const w=876,h=140,radius=28,zone=30;const [slab,g]=canvas(w,h);const output=g.createImageData(w,h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
  const qx=Math.abs(x-w/2)-(w/2-radius),qy=Math.abs(y-h/2)-(h/2-radius);
  const ox=Math.max(qx,0),oy=Math.max(qy,0);const distance=Math.sqrt(ox*ox+oy*oy)+Math.min(Math.max(qx,qy),0)-radius;
  const alpha=Math.max(0,Math.min(1,-distance));if(!alpha)continue;
  let nx=qx>qy?1:0,ny=qx>qy?0:1;if(qx>0&&qy>0){const length=Math.sqrt(ox*ox+oy*oy);nx=ox/length;ny=oy/length;}
  if(x<w/2)nx=-nx;if(y<h/2)ny=-ny;
  const depth=-distance,t=Math.max(0,1-depth/zone),offset=t*t*16;
  const sx=Math.max(0,Math.min(479,Math.round((84+(x+nx*offset)*2)/4)));
  const sy=Math.max(0,Math.min(269,Math.round((696+(y+ny*offset)*2)/4)));
  const source=(sy*480+sx)*4,target=(y*w+x)*4;
  const light=Math.max(0,-(nx*.45+ny*.9));const rim=Math.max(0,1-depth/1.3)*(.25+.5*light)+t*.09*light;
  for(let k=0;k<3;k++){const milky=glass[source+k]*.63+30;output.data[target+k]=milky+(255-milky)*rim;}
  output.data[target+3]=alpha*245;
 }
 g.putImageData(output,0,0);return {blur,dock:slab.toDataURL('image/png')};
}
