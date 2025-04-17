import { DOCUMENT } from '@angular/common';
import { Component, Inject, Renderer2 } from '@angular/core';

@Component({
  selector: 'app-footer',
  imports: [],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css',
})
export class FooterComponent {
  constructor(
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit() {
    // إضافة سكربت Klaviyo لنموذج الاشتراك
    const script = this.renderer.createElement('script');
    script.type = 'text/javascript';
    script.text = `!function(){if(!window.klaviyo){window._klOnsite=window._klOnsite||[];window.klaviyo={init:function(t){for(var e in t)t.hasOwnProperty(e)&&(this[e]=t[e]);this.push=function(t){window._klOnsite.push(t)}}}}();window.klaviyo.init({company_id:"QXDLFh
"});var s=document.createElement("script");s.async=!0,s.src="https://static.klaviyo.com/onsite/js/klaviyo.js";document.head.appendChild(s);`;
    this.renderer.appendChild(this.document.body, script);
  }
}
