// Compact binary layout for stop_times, loaded with zero parsing at server start.
//
// header   Uint32[8]  magic, version, nTrips, nStopTimes, nStops, nDeps, 0, 0
// tripOff  Uint32[nTrips+1]   stop_times of trip t are [tripOff[t], tripOff[t+1])
// stTime   Int32[nStopTimes]  departure seconds after service-day start
// depOff   Uint32[nStops+1]   departures of stop s are depRef[depOff[s]..depOff[s+1])
// depRef   Uint32[nDeps]      stop_time index, sorted by time within each stop
// stStop   Uint16[nStopTimes] stop index (padded to 4 bytes)

const MAGIC = 0x47544653;
const VERSION = 1;

export interface StopTimesIndex {
  tripOff: Uint32Array;
  stTime: Int32Array;
  depOff: Uint32Array;
  depRef: Uint32Array;
  stStop: Uint16Array;
}

export function encodeStopTimes(ix: StopTimesIndex): Buffer {
  const nTrips = ix.tripOff.length - 1;
  const nStops = ix.depOff.length - 1;
  const header = new Uint32Array([MAGIC, VERSION, nTrips, ix.stTime.length, nStops, ix.depRef.length, 0, 0]);
  const stopBytes = Buffer.from(ix.stStop.buffer, ix.stStop.byteOffset, ix.stStop.byteLength);
  const pad = Buffer.alloc((4 - (stopBytes.length % 4)) % 4);
  return Buffer.concat([header, ix.tripOff, ix.stTime, ix.depOff, ix.depRef].map(asBuffer).concat(stopBytes, pad));
}

function asBuffer(a: Uint32Array | Int32Array): Buffer {
  return Buffer.from(a.buffer, a.byteOffset, a.byteLength);
}

export function decodeStopTimes(buf: Buffer): StopTimesIndex {
  // Copy into an aligned ArrayBuffer so typed-array views are valid.
  const ab = new Uint8Array(buf).buffer;
  const header = new Uint32Array(ab, 0, 8);
  if (header[0] !== MAGIC || header[1] !== VERSION) throw new Error("stop-times.bin: bad magic/version, rerun data:build");
  const [, , nTrips, nStopTimes, nStops, nDeps] = header;
  let off = 32;
  const take = <T>(ctor: new (b: ArrayBuffer, o: number, n: number) => T, n: number, bytes: number): T => {
    const v = new ctor(ab, off, n);
    off += n * bytes;
    return v;
  };
  const tripOff = take(Uint32Array, nTrips + 1, 4);
  const stTime = take(Int32Array, nStopTimes, 4);
  const depOff = take(Uint32Array, nStops + 1, 4);
  const depRef = take(Uint32Array, nDeps, 4);
  const stStop = take(Uint16Array, nStopTimes, 2);
  return { tripOff, stTime, depOff, depRef, stStop };
}
