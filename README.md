# Adventure Hub (Advhub)

Adventure Hub is a modern e-commerce web application built with Angular, designed to help users discover, browse, and purchase adventure-related products and experiences. The application integrates with a WooCommerce backend and supports features such as authentication (including Google and Facebook sign-in), product browsing, cart management, and order processing.

## Features

- **User Authentication**: Sign up, log in, and log out using email/password or OAuth providers (Google, Facebook).
- **Product Catalog**: Browse adventure products fetched from a WooCommerce API.
- **Cart Management**: Add, remove, and update items in your cart. Cart state is managed using NgRx/store and can persist in local storage.
- **Order Management**: Proceed through checkout and payment (Stripe integration).
- **Responsive UI**: Built with Angular and PrimeNG for a seamless experience across devices.
- **Service Worker**: Supports PWA capabilities and offline caching for production builds.
- **Error Handling and Caching**: Robust error handling and data caching for improved performance.

## Technologies Used

- **Frontend**: Angular 17+, Angular CLI, PrimeNG, RxJS, NgRx/store, Tailwind CSS
- **Backend Integration**: WooCommerce REST API
- **Authentication**: JWT, Google OAuth, Facebook OAuth
- **Payments**: Stripe
- **PWA**: Angular Service Worker

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- Angular CLI (`npm install -g @angular/cli`)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Mohamed-sabry-av/adventure-hub.git
   cd adventure-hub
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Development Server

To start a local development server, run:
```bash
ng serve
```
Navigate to [http://localhost:4200/](http://localhost:4200/) in your browser. The app will reload automatically if you change any source files.

### Code Scaffolding

You can generate new components, directives, or pipes using Angular CLI:
```bash
ng generate component component-name
ng generate --help
```

### Building for Production

To build the project for production:
```bash
ng build
```
The build artifacts will be stored in the `dist/` directory.

### Running Tests

- **Unit Tests**:  
  ```bash
  ng test
  ```
- **End-to-End Tests**:  
  ```bash
  ng e2e
  ```

## Environment Variables

Set up environment variables for API endpoints, Stripe keys, and OAuth credentials as needed in your environment files.

## Additional Resources

- [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli)
- [WooCommerce REST API Docs](https://woocommerce.github.io/woocommerce-rest-api-docs/)
- [PrimeNG Documentation](https://primeng.org/)

## License

This project is licensed under the MIT License.

---

*Adventure Hub* makes it easy to explore and shop for your next adventure!
