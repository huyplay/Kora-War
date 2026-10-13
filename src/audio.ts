export class Sound {
  enabled=true; ctx:AudioContext|null=null;
  unlock(){if(!this.ctx)this.ctx=new AudioContext();if(this.ctx.state==='suspended')void this.ctx.resume();}
  tone(kind:'play'|'hit'|'skill'|'win'|'lose'|'click'){
    if(!this.enabled||!this.ctx)return;
    const c=this.ctx,t=c.currentTime,notes=kind==='win'?[392,494,587,784]:kind==='lose'?[294,247,196]:kind==='skill'?[330,660,990]:kind==='play'?[220,440]:[kind==='hit'?120:520];
    notes.forEach((freq,i)=>{const o=c.createOscillator(),g=c.createGain();o.type=kind==='hit'?'triangle':'sine';o.frequency.setValueAtTime(freq,t+i*.08);g.gain.setValueAtTime(0,t+i*.08);g.gain.linearRampToValueAtTime(kind==='hit'?.035:.065,t+i*.08+.015);g.gain.exponentialRampToValueAtTime(.001,t+i*.08+.22);o.connect(g);g.connect(c.destination);o.start(t+i*.08);o.stop(t+i*.08+.25);});
  }
}
