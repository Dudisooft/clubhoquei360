/* A monotonic, manual analysis clock. Reload always resumes paused. Clock
 * adjustments flush observed possession first and never create possession time. */
export class AnalysisClock {
  constructor(state={},now=()=>performance.now()){
    this.now=now;this.period=Number(state.period)||1;this.ms=Number(state.ms)||0;this.mode=state.mode==='live'?'live':'video';this.videoUrl=state.videoUrl||'';
    this.running=false;this.possession=null;this.segments=[];this.anchor=this.now();this.segmentStart=this.ms;
  }
  advance(){const next=this.now();if(this.running){const delta=Math.max(0,next-this.anchor);this.ms=Math.min(21600000,this.ms+delta);}this.anchor=next;return this.ms;}
  flush(){this.advance();if(this.possession&&this.ms>this.segmentStart)this.segments.push({period:this.period,match_ms:Math.round(this.ms),duration_ms:Math.round(this.ms-this.segmentStart),side:this.possession,action:'possession'});this.segmentStart=this.ms;return this.segments.splice(0);}
  play(){this.anchor=this.now();this.running=true;this.segmentStart=this.ms;}
  pause(){const chunks=this.flush();this.running=false;this.possession=null;return chunks;}
  selectPossession(side){const chunks=this.flush();this.possession=side;return chunks;}
  adjust(ms,period=this.period){const chunks=this.flush();this.ms=Math.max(0,Math.min(21600000,ms));this.period=period;this.segmentStart=this.ms;return chunks;}
  snapshot(){this.advance();return {period:this.period,ms:Math.round(this.ms),mode:this.mode,videoUrl:this.videoUrl};}
}
