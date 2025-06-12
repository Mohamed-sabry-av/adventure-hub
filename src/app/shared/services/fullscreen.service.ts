import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FullscreenService {
  // Signal to track if any component is in fullscreen mode
  private _isFullscreen = signal(false);
  
  // Public getter for the fullscreen state
  get isFullscreen() {
    return this._isFullscreen;
  }
  
  // Method to enter fullscreen mode
  enterFullscreen() {
    this._isFullscreen.set(true);
  }
  
  // Method to exit fullscreen mode
  exitFullscreen() {
    this._isFullscreen.set(false);
  }
} 