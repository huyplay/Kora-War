import test from 'node:test';
import assert from 'node:assert/strict';
import { CardGesture } from '../src/engine/input/card-gesture.ts';
test('pointer input captures one finger, cancels safely and suppresses duplicate click after a drag',()=>{
  const oldDocument=Object.getOwnPropertyDescriptor(globalThis,'document');
  const oldWindow=Object.getOwnPropertyDescriptor(globalThis,'window');
  const documentEvents=new EventTarget(),windowEvents=new EventTarget();
  Object.defineProperty(globalThis,'document',{value:documentEvents,configurable:true});
  Object.defineProperty(globalThis,'window',{value:windowEvents,configurable:true});
  let captured=false,moves=0,drops=0,cancels=0;
  const target={setPointerCapture:()=>{captured=true;},hasPointerCapture:()=>captured,releasePointerCapture:()=>{captured=false;}};
  const event=(id=1,x=0,y=0)=>({pointerId:id,clientX:x,clientY:y,isPrimary:true,button:0,currentTarget:target}) as unknown as PointerEvent;
  const send=(type:string,id:number,x:number,y:number)=>{
    const e=new Event(type);Object.defineProperties(e,{pointerId:{value:id},clientX:{value:x},clientY:{value:y}});documentEvents.dispatchEvent(e);
  };
  const gesture=new CardGesture({canStart:id=>id==='solan',move:()=>moves++,drop:()=>drops++,cancel:()=>cancels++,end:()=>{}});
  try{
    gesture.begin(event(),'unknown');assert.equal(captured,false);
    gesture.begin(event(),'solan');assert.equal(captured,true);
    send('pointermove',2,20,20);assert.equal(moves,0);
    send('pointermove',1,2,2);assert.equal(moves,0);
    send('pointermove',1,20,20);assert.equal(moves,1);
    send('pointerup',1,20,20);assert.equal(drops,1);assert.equal(captured,false);assert.ok(gesture.suppressClick);
    send('pointerup',1,20,20);assert.equal(drops,1);
    gesture.begin(event(),'solan');send('pointercancel',1,0,0);assert.equal(cancels,1);assert.equal(drops,1);
    gesture.begin(event(),'solan');gesture.cancel();assert.equal(captured,false);assert.equal(cancels,2);
    gesture.dispose();send('pointermove',1,20,20);assert.equal(moves,1);
  }finally{
    gesture.dispose();
    if(oldDocument)Object.defineProperty(globalThis,'document',oldDocument);else Reflect.deleteProperty(globalThis,'document');
    if(oldWindow)Object.defineProperty(globalThis,'window',oldWindow);else Reflect.deleteProperty(globalThis,'window');
  }
});
