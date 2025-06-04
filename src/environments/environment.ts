export const environment = {
    production: false,
    // API and backend configurations
    apiUrl: 'http://46.202.88.235',
    baseUrl: 'https://adventures-hub.com',
    wooCommerceUrl: 'https://adventures-hub.com',
    wordpressApiUrl: 'https://adventures-hub.com/wp-json/wc/v3/',
    customApiUrl: 'https://adventures-hub.com/wp-json/custom/v1',
    authApiUrl: 'https://adventures-hub.com/wp-json/jwt-auth/v1',
    wcStoreApiUrl: 'https://adventures-hub.com/wp-json/wc/store/v1',
    
    // WooCommerce
    wooCommerce: {
      consumerKey: 'ck_74222275d064648b8c9f21284e42ed37f8595da5',
      consumerSecret: 'cs_4c9f3b5fd41a135d862e973fc65d5c049e05fee4'
    },
    
    // Klaviyo
    klaviyo: {
      publicApiKey: 'QXDLFh',
      privateApiKey: 'YOUR_KLAVIYO_PRIVATE_API_KEY'
    },
    
    // Stripe
    stripe: {
      publishableKey: 'pk_test_51RGe55G0IhgrvppwwIADEDYdoX8XFiOhi4hHHl9pztg3JjECc5QHfQOn7N0Wjyyrw6n6BZJtNF7GFXtakPSvwHkx00vBmKZw45',
      secretKey: 'sk_test_51RGe55G0IhgrvppwWhuoe6UzUFXRcQf5duoJiNMmU0C9qlJxZbxtu0tm7guQaJUNdwVPUPdQCef2DH7CRCsgp2sG00Nmg3aqBs'
    },
    
    // Tabby
    tabby: {
      publicKey: 'pk_test_f88769b5-ae9f-45e4-93e3-43eb557c1b3c',
      merchantCode: 'AE'
    },
    
    // Google Tag Manager
    gtm: {
      id: 'GTM-KQZ3H8ND'
    },
    
    // Facebook
    facebook: {
      appId: '639673088797642'
    },
    
    // Google
    google: {
      clientId: '229026488808-ibbjvje0scn4bguqpauhfeqqakf2g43r.apps.googleusercontent.com'
    },
    
    // Social Auth
    socialAuth: {
      facebook: {
        appId: '834825131701175',
        version: 'v17.0'
      }
    }
  };
