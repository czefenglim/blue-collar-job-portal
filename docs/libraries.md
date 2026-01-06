# Project Libraries

This document lists all the libraries used in the frontend and backend of the application, along with their specific purposes in this project.

## Frontend Libraries

### Dependencies

- **@expo/vector-icons**: This library provides a wide range of customizable icons (like Ionicons, FontAwesome) used throughout the application for navigation bars, buttons, and status indicators.
- **@prisma/client**: This library is the auto-generated query builder for Prisma. In the frontend context, it is likely used to share TypeScript types (like `User`, `Job`, `Company`) between the backend and frontend to ensure type safety.
- **@react-native-async-storage/async-storage**: This library provides an unencrypted, asynchronous, persistent, key-value storage system. It is used to store the user's session token (`jwtToken`) and preferences (like language settings) locally on the device.
- **@react-native-community/datetimepicker**: This library exposes the native date and time picker components (iOS and Android) for selecting dates, such as birthdates or job start dates.
- **@react-native-picker/picker**: This library provides a native picker component (dropdown) for selecting options, used for choosing industries, languages, or job types in forms.
- **@react-navigation/bottom-tabs**: This library implements the bottom tab navigation pattern, allowing users to switch between the main screens (Home, Applications, Saved Jobs, Profile) easily.
- **@react-navigation/elements**: This library provides UI elements (like headers) used by React Navigation navigators.
- **@react-navigation/native**: This is the core library for routing and navigation in the React Native app, managing the navigation tree and state.
- **@react-navigation/native-stack**: This library provides a way for the app to transition between screens where each new screen is placed on top of a stack, using native platform animations.
- **@types/jsonwebtoken**: This library provides TypeScript type definitions for `jsonwebtoken`, useful if the frontend needs to decode tokens for client-side logic.
- **bcryptjs**: This library is used for hashing and comparing passwords. While primarily a backend tool, it is included here, possibly for specific client-side hashing operations or as a shared dependency.
- **date-fns**: This library provides a comprehensive toolset for manipulating JavaScript dates. It is used for formatting dates (e.g., "posted 2 days ago") in job listings and chat messages.
- **expo**: The core Expo SDK library that enables the project to run as an Expo app, providing access to system functionality and native modules.
- **expo-blur**: This library provides a component for applying a blur effect to views, used for overlays or aesthetic UI elements.
- **expo-clipboard**: This library allows the app to copy and paste text to and from the system clipboard.
- **expo-constants**: This library provides system information and configuration constants (like `API_BASE_URL` from `app.json`) to the application at runtime.
- **expo-dev-client**: This library allows for creating a custom development build, enabling the use of native libraries that are not included in the standard Expo Go app.
- **expo-device**: This library provides access to device information such as the model, manufacturer, and OS version.
- **expo-document-picker**: This library provides access to the system's UI for selecting documents, used for uploading resumes or verification files.
- **expo-font**: This library allows loading custom fonts from the web or local assets to ensure consistent typography across the app.
- **expo-haptics**: This library provides haptic feedback (vibrations) for user interactions, enhancing the tactile experience of the app.
- **expo-image**: This library provides a highly optimized image component for React Native, used for rendering user avatars, company logos, and other images efficiently.
- **expo-image-picker**: This library provides access to the system's UI for selecting images from the phone's library or taking a photo with the camera.
- **expo-linear-gradient**: This library renders a gradient view, used for creating visually appealing backgrounds and buttons.
- **expo-linking**: This library allows the app to interact with incoming and outgoing deep links, enabling the app to open specific screens from URLs.
- **expo-notifications**: This library provides an API for fetching push notification tokens and handling incoming notifications for alerts like new messages or job updates.
- **expo-router**: This library provides file-system-based routing for Expo, allowing navigation to be defined by the directory structure of the `app` folder.
- **expo-speech**: This library provides text-to-speech functionality, allowing the app to read out text (e.g., job descriptions) to the user.
- **expo-speech-recognition**: This library provides speech recognition capabilities, enabling voice-to-text features for accessibility or easier input.
- **expo-splash-screen**: This library allows control over the native splash screen, keeping it visible while the app loads resources.
- **expo-status-bar**: This library provides a component to control the app's status bar style (light/dark content).
- **expo-symbols**: This library provides access to SF Symbols (on iOS), offering a wide range of system icons.
- **expo-system-ui**: This library allows interacting with system UI elements, such as changing the background color of the root view.
- **expo-web-browser**: This library provides access to the system's web browser, used for opening external links or handling OAuth flows.
- **express-rate-limit**: (Note: Typically backend) This library is likely included for type compatibility or shared code, as it is used for rate limiting API requests.
- **express-validator**: (Note: Typically backend) This library is likely included for type compatibility or shared validation logic.
- **helmet**: (Note: Typically backend) This library helps secure Express apps; its presence in frontend might be for shared types or misconfiguration.
- **i18n-js**: This library is used for internationalization, allowing the app to support multiple languages (English, Malay, Chinese, Tamil) by managing translation strings.
- **jsonwebtoken**: This library is used to generate and verify JSON Web Tokens (JWT). In the frontend, it may be used to decode tokens to extract user information (like user ID or role) without making an API call.
- **nativewind**: This library allows using Tailwind CSS classes to style React Native components, streamlining the UI development process.
- **react**: The core React library for building user interfaces.
- **react-dom**: The entry point to the DOM and server renderers for React, used for the web version of the Expo app.
- **react-native**: The core framework for building native apps using React.
- **react-native-gesture-handler**: This library provides native-driven gesture management APIs for building complex touch-based interactions.
- **react-native-google-places-autocomplete**: This library provides a customizable autocomplete component for Google Places, helping users easily search and select locations.
- **react-native-keyboard-aware-scroll-view**: This library handles keyboard appearance, automatically scrolling input fields into view so they are not covered by the keyboard.
- **react-native-modal-datetime-picker**: This library exposes a cross-platform modal date and time picker, providing a unified experience for date selection.
- **react-native-pdf**: This library is used to display PDF files within the app, allowing users to view resumes and contracts directly.
- **react-native-picker-select**: This library provides a picker component (dropdown) for React Native that mimics the native picker behavior.
- **react-native-reanimated**: This library provides a comprehensive animation library for creating smooth, high-performance animations.
- **react-native-safe-area-context**: This library provides a flexible way to handle safe area insets (notches, home indicators) to ensure content is not obstructed.
- **react-native-screens**: This library exposes native navigation container primitives, improving memory consumption and performance of navigation.
- **react-native-web**: This library makes it possible to run React Native components and APIs on the web.
- **react-native-webview**: This library renders a native WebView, allowing the app to display web content (e.g., payment gateways, external articles).
- **react-native-worklets**: This library allows running JavaScript code on a separate thread (UI thread), often used with Reanimated.
- **slugify**: This library is used to generate URL-safe slugs from strings (e.g., turning "Job Title" into "job-title").
- **socket.io-client**: This library is the client-side implementation of Socket.IO, used to establish a real-time, bidirectional connection with the backend for chat features.
- **tailwindcss**: A utility-first CSS framework used via NativeWind to style the application.

## Backend Libraries

### Dependencies

- **@aws-sdk/client-s3**: This library is the AWS SDK client for S3, used to upload, retrieve, and delete files (like resumes, company logos) from AWS S3 storage.
- **@aws-sdk/s3-request-presigner**: This library is used to generate presigned URLs, allowing the frontend to securely upload or download files directly to/from S3 without passing them through the backend server.
- **@google-cloud/translate**: This library provides a client for the Google Cloud Translation API, used to translate dynamic content (like job descriptions or chat messages) between supported languages.
- **@google/generative-ai**: This library is the client for Google's Gemini AI models, used to power the AI Assistant feature that helps users with queries.
- **@huggingface/inference**: This library provides a client for Hugging Face's Inference API, potentially used for specialized AI tasks like text classification or sentiment analysis.
- **@prisma/client**: This library is the auto-generated query builder for Prisma ORM, used to perform CRUD operations and complex queries against the MySQL database.
- **@react-native-async-storage/async-storage**: (Note: Typically frontend) Likely included for shared code or types, or potentially for a specific Node.js storage implementation if needed.
- **@sendgrid/mail**: This library is used to send transactional emails (such as account verification, password resets, or job alerts) via the SendGrid service.
- **@types/helmet**: TypeScript definitions for the `helmet` security middleware.
- **@types/jsonwebtoken**: TypeScript definitions for `jsonwebtoken`.
- **@types/pdfkit**: TypeScript definitions for `pdfkit`.
- **axios**: This library is a promise-based HTTP client used to make requests to external APIs (e.g., AI services, payment gateways) from the backend.
- **bcryptjs**: This library is used to securely hash passwords (using salt) before storing them in the database and to verify passwords during login.
- **body-parser**: This middleware parses incoming request bodies (JSON, URL-encoded data) before your handlers, making the `req.body` object available.
- **cohere-ai**: This library is the client for Cohere's Large Language Models (LLMs), used for tasks like verifying job postings (checking for legitimacy) or cleaning text data.
- **cors**: This middleware enables Cross-Origin Resource Sharing (CORS), allowing the frontend application (hosted on a different domain/port) to communicate with the backend API.
- **date-fns**: This library provides utility functions for parsing, validating, manipulating, and formatting dates on the backend.
- **expo-constants**: Used to access system constants, potentially for shared configuration logic.
- **expo-device**: Used to access device information, possibly for logging or analytics on the server side.
- **expo-notifications**: This library provides the server-side API to send push notifications to Expo apps (via Expo's push notification service).
- **expo-server-sdk**: This library is the official Node.js SDK for sending push notifications to Expo devices.
- **express**: This is the fast, unopinionated, minimalist web framework for Node.js, used to build the REST API.
- **express-rate-limit**: This middleware is used to limit repeated requests to public APIs and/or endpoints such as password reset, helping to prevent brute-force attacks.
- **express-validator**: This library is a set of express.js middlewares that wraps validator.js, used to validate and sanitize incoming request data (e.g., checking if an email is valid).
- **helmet**: This middleware helps secure the Express app by setting various HTTP headers (e.g., `Strict-Transport-Security`, `X-Frame-Options`).
- **jsonwebtoken**: This library is used to generate (sign) and verify JSON Web Tokens (JWT), which are used for stateless user authentication and authorization.
- **multer**: This middleware handles `multipart/form-data`, which is primarily used for uploading files (like resumes and images) to the server before processing or sending to S3.
- **node-cron**: This library allows scheduling tasks (cron jobs) in Node.js, such as running daily cleanup scripts or sending scheduled notifications.
- **node-fetch**: A light-weight module that brings `window.fetch` to Node.js, used for making HTTP requests (alternative to axios).
- **nodemailer**: This library is a module for Node.js applications to send emails. It might be used as an alternative to SendGrid or for specific email transport configurations.
- **openai**: This library is the official Node.js client library for the OpenAI API, available for integrating GPT models for text generation or other AI features.
- **pdf-parse**: This library is used to extract text and data from PDF files, useful for parsing uploaded resumes to auto-fill application forms.
- **pdfkit**: This library is used to generate PDF documents programmatically, such as creating employment contracts or downloadable reports.
- **react-native-get-random-values**: Polyfill for `crypto.getRandomValues` in React Native, likely included in backend for shared code compatibility involving UUIDs or crypto.
- **react-native-url-polyfill**: Polyfill for the URL API in React Native, likely included for shared code compatibility.
- **slugify**: This library converts strings into URL-friendly slugs (e.g., "Software Engineer" -> "software-engineer"), used for generating clean URLs for job postings.
- **socket.io**: This library enables real-time, bidirectional and event-based communication. It powers the chat feature, allowing instant messaging between users.
- **socket.io-client**: The client-side library for Socket.IO, likely included in backend for testing purposes or if the backend acts as a client to another service.
- **stripe**: This library provides access to the Stripe API, used for processing payments, managing subscriptions, and handling financial transactions.
- **uuid**: This library is used to generate RFC4122 compliant UUIDs (Universally Unique Identifiers), often used for creating unique file names or database IDs.
