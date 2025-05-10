import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { config } from './app/app.config.server';
import { enableProdMode } from '@angular/core';

// Enable production mode for SSR
enableProdMode();

const bootstrap = () => bootstrapApplication(AppComponent, config);

export default bootstrap;
