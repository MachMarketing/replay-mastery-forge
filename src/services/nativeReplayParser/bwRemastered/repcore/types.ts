
/**
 * RepCore Types - Frame system and basic types
 * Direct port from Go repcore package with accurate timing
 */

// Frame is the basic time unit in StarCraft
// There are approximately ~23.81 frames in a second
// 1 frame = 0.042 second = 42 ms to be exact
export class Frame {
  constructor(public value: number) {}

  // Seconds returns the time equivalent to the frames in seconds
  seconds(): number {
    return this.milliseconds() / 1000;
  }

  // Milliseconds returns the time equivalent to the frames in milliseconds
  milliseconds(): number {
    return this.value * 42;
  }

  // Duration returns the frame as milliseconds
  duration(): number {
    return this.milliseconds();
  }

  // String returns a human-friendly mm:ss representation, e.g. "03:12"
  // or if the frame represents bigger than an hour: "1:02:03"
  toString(): string {
    const sec = Math.floor(this.milliseconds() / 1000);
    const min = Math.floor(sec / 60);
    
    if (min < 60) {
      return `${min.toString().padStart(2, '0')}:${(sec % 60).toString().padStart(2, '0')}`;
    }
    
    const hour = Math.floor(min / 60);
    return `${hour}:${(min % 60).toString().padStart(2, '0')}:${(sec % 60).toString().padStart(2, '0')}`;
  }

  // Static method to convert milliseconds to Frame
  static fromDuration(milliseconds: number): Frame {
    return new Frame(Math.floor(milliseconds / 42));
  }

  // Convert frame to time string using exact SC:R timing
  static frameToTime(frame: number): string {
    return new Frame(frame).toString();
  }

  // Convert time string to frame
  static timeToFrame(timeStr: string): number {
    const parts = timeStr.split(':').map(p => parseInt(p));
    if (parts.length === 2) {
      // mm:ss format
      return Math.floor((parts[0] * 60 + parts[1]) * 23.81);
    } else if (parts.length === 3) {
      // h:mm:ss format
      return Math.floor((parts[0] * 3600 + parts[1] * 60 + parts[2]) * 23.81);
    }
    return 0;
  }
}

// Point describes a point in the map
// 1 Tile is 32 units (pixel)
export interface Point {
  x: number;
  y: number;
}

export function pointToString(p: Point): string {
  return `x=${p.x}, y=${p.y}`;
}

// Constants for accurate timing
export const FRAMES_PER_SECOND = 23.81;
export const MILLISECONDS_PER_FRAME = 42;

// Helper functions for time conversion
export function framesToSeconds(frames: number): number {
  return frames / FRAMES_PER_SECOND;
}

export function secondsToFrames(seconds: number): number {
  return Math.floor(seconds * FRAMES_PER_SECOND);
}

export function framesToTimeString(frames: number): string {
  return Frame.frameToTime(frames);
}
