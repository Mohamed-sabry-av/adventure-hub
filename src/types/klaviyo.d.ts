interface Klaviyo {
    push(event: [string, string, { [key: string]: any }]): void;
  }
  
  declare global {
    interface Window {
      _learnq: Klaviyo | any[];
    }
  }