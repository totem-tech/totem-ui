# Totem UI - Technical Overview

## Project Description

**Totem** is an ambitious blockchain-based accounting and business management system designed to create a "global, interconnected, realtime accounting system for everyone." The project aims to reinvent accounting for the modern connected world by eliminating the need for separate accounting systems.

This repository contains the frontend UI application that provides a comprehensive business management platform with accounting, timekeeping, project management, communication, and blockchain integration capabilities.

## Tech Stack

### Core Technologies
- **Frontend Framework**: React 16.8.6 with JSX
- **UI Component Library**: Semantic UI React 0.88.2
- **Build System**: Webpack 5.76.2 with Babel
- **State Management**: RxJS 7.5.7 (Reactive programming with BehaviorSubjects and Observables)
- **Blockchain Integration**: Polkadot.js API 0.100.1
- **Language**: JavaScript (ES6+)
- **Package Manager**: npm/yarn

### Development Tools
- **Bundler**: Webpack with development server
- **Transpiler**: Babel (ES6+ and React support)
- **CSS Framework**: Semantic UI CSS 2.4.1
- **Styling**: Styled Components 6.0.0-rc.3
- **Server**: Express.js 4.17.1 (development server)

### Blockchain & Crypto
- **Blockchain Platform**: Polkadot/Substrate
- **Keyring Management**: @polkadot/keyring 1.8.1
- **Crypto Libraries**: 
  - @polkadot/wasm-crypto 0.14.1
  - crypto-browserify 3.12.0
  - bip39 (mnemonic generation)
  - NaCl (encryption utilities)

### Communication & Networking
- **Real-time Communication**: Socket.io-client 3.0.4
- **WebSocket**: uws 10.148.1
- **HTTP Client**: Built-in fetch with PromisE wrapper

### Data Management
- **Local Storage**: Custom DataStorage abstraction layer
- **State Management**: RxJS BehaviorSubjects and Subjects
- **Data Persistence**: Browser localStorage / Node.js file system

## Application Architecture

### Service-Oriented Architecture
The application follows a service-oriented architecture with clear separation of concerns:

```
src/
├── components/          # Reusable UI components
├── modules/            # Feature modules (business logic)
├── services/           # Core application services
├── utils/              # Utility functions and helpers
├── forms/              # Form components
├── views/              # Page-level view components
└── legacies/           # Legacy components
```

### Core Services (`src/services/`)
- **blockchain.js**: Polkadot blockchain connectivity and query management
- **sidebar.js**: Navigation and module management
- **queue.js**: Transaction queue management for blockchain operations
- **modal.jsx**: Modal dialog management
- **toast.jsx**: Notification toast system
- **language.js**: Internationalization support

### Data Storage Layer (`src/utils/DataStorage.js`)
- Abstraction layer over localStorage (browser) and file system (Node.js)
- Map-like interface with search, filtering, and reactive updates
- Automatic persistence with RxJS integration
- Support for cache management and data validation

## Main Feature Modules

### 1. Identity Management (`src/modules/identity/`)
**Purpose**: Manage multiple user identities and cryptographic keys
- **Core Components**: IdentityList, IdentityForm, IdentityDetailsForm
- **Key Features**:
  - Multiple identity support (personal, business, reward types)
  - Mnemonic seed phrase generation and management
  - Polkadot address derivation
  - Identity sharing and backup capabilities
  - Default identity creation for new users

### 2. Timekeeping (`src/modules/timekeeping/`)
**Purpose**: Time tracking for activities and projects
- **Core Components**: TimekeepingView, TimekeepingForm, Timer
- **Key Features**:
  - Block-based time recording on blockchain
  - Multiple duration formats (blocks, HH:MM:SS, rounded intervals)
  - Project invitation and worker management
  - Time record approval workflow
  - Archive and dispute handling

### 3. Chat System (`src/modules/chat/`)
**Purpose**: Real-time messaging and communication
- **Core Components**: ChatBar, Inbox, InboxList, InboxMessages
- **Key Features**:
  - Private and group messaging
  - Trollbox (public chat)
  - Support channel
  - Message encryption support
  - Online status tracking
  - Message history persistence

### 4. Activity Management (`src/modules/activity/`)
**Purpose**: Project and activity management
- **Core Components**: ActivityList, ActivityForm, ActivityDetails
- **Key Features**:
  - Activity creation and management
  - Team member assignment
  - Activity reassignment
  - Integration with timekeeping
  - Automatic accounting integration

### 5. Partner Management (`src/modules/partner/`)
**Purpose**: Contact and partner relationship management
- **Core Components**: PartnerList, PartnerForm, CompanyForm
- **Key Features**:
  - Supplier and customer management
  - Identity sharing between partners
  - Company information management
  - Partner search and filtering

### 6. Financial Statement (`src/modules/financialStatement/`)
**Purpose**: Accounting and financial reporting
- **Core Components**: FinancialStatement, PostingList
- **Key Features**:
  - General ledger account management
  - Hierarchical chart of accounts
  - Balance calculations and reporting
  - Multi-level drill-down views

### 7. Task Management (`src/modules/task/`)
**Purpose**: Task creation and marketplace functionality
- **Core Components**: TaskList, TaskForm, TaskDetails, marketplace components
- **Key Features**:
  - Task creation and assignment
  - Marketplace for task applications
  - Task search and filtering
  - Application management

### 8. Currency Management (`src/modules/currency/`)
**Purpose**: Multi-currency support and conversion
- **Core Components**: Currency, CurrencyDropdown, Converter
- **Key Features**:
  - Multiple currency support
  - Real-time conversion rates
  - Currency selection interface

### 9. Rewards System (`src/modules/rewards/`)
**Purpose**: User incentives and token claiming
- **Core Components**: RewardsView, ClaimKapexForm, reward cards
- **Key Features**:
  - KAPEX token claiming
  - Social media integration rewards
  - Referral system
  - Discord and Twitter reward wizards

### 10. Notification System (`src/modules/notification/`)
**Purpose**: System-wide notification management
- **Core Components**: NotificationView, NotificationItem
- **Key Features**:
  - Real-time notifications
  - Unread count tracking
  - Notification categorization

## Core UI Components (`src/components/`)

### Form Components
- **FormBuilder**: Dynamic form generation with validation
- **FormInput**: Comprehensive input component supporting multiple field types
- **DateInput**: Date/time selection with calendar interface
- **UserIdInput**: Specialized input for user ID selection
- **CheckboxGroup**: Multi-select checkbox groups

### Data Display Components
- **DataTable**: Feature-rich table with sorting, filtering, and pagination
- **DataTableVertical**: Vertical layout table for detailed views
- **DrillDownList**: Hierarchical expandable lists
- **Currency**: Currency value display with formatting
- **TimeSince**: Relative time display

### UI Enhancement Components
- **PageHeader**: Main application header with navigation
- **SidebarLeft**: Collapsible navigation sidebar
- **Modal**: Modal dialog system
- **Paginator**: Pagination controls
- **Tags**: Tag display and management
- **Invertible**: Dark/light theme switching
- **Button Components**: Comprehensive button library with various states

### Utility Components
- **CatchReactErrors**: Error boundary for graceful error handling
- **JSONView**: JSON data visualization
- **StringReplace**: Text processing and replacement
- **RxSubjectView**: RxJS state visualization

## Key Utilities and Helpers

### Blockchain Integration (`src/utils/substrate/`)
- **BlockchainHelper**: Core blockchain interaction utilities
- **ExtensionHelper**: Browser extension integration
- **keyringHelper**: Cryptographic key management
- **identityHelper**: Identity validation and management

### Encryption and Security (`src/utils/naclHelper/`)
- **box.js**: Public key encryption
- **secretBox.js**: Secret key encryption
- **sign.js**: Digital signatures
- **utils.js**: Cryptographic utilities

### React Utilities (`src/utils/reactjs/`)
- **hooks/**: Custom React hooks for common patterns
- **components/**: Reusable utility components
- **form/**: Form validation and processing utilities

### External Integrations
- **twitterHelper**: Twitter API integration
- **discordHelper**: Discord API integration
- **chatClient**: WebSocket chat client
- **BlockchairClient**: Blockchain explorer integration

## Development and Build Configuration

### Webpack Configuration
- **Development**: Hot reload with source maps
- **Production**: Optimized bundling with compression
- **SSL Support**: HTTPS development server support
- **Asset Management**: Automatic asset copying and optimization
- **Code Splitting**: Vendor and application bundle separation

### Babel Configuration
- **Presets**: ES6+ and React support
- **Target**: Last 2 browser versions
- **Polyfills**: Comprehensive polyfill support

### Scripts
- `npm run dev`: Development mode with hot reload
- `npm run build`: Production build
- `npm run start`: Development server with language file generation
- `npm run buildlang`: Generate language files

## Notable Technical Features

### Reactive Programming
- Extensive use of RxJS for state management
- BehaviorSubjects for persistent state
- Subjects for event handling
- Reactive data storage with automatic UI updates

### Blockchain Integration
- Direct Polkadot network connectivity
- Real-time block number tracking
- Transaction queue management
- Cryptographic key management

### Internationalization
- Dynamic language file generation
- Multi-language support infrastructure
- Translation helpers and utilities

### Data Persistence
- Cross-platform storage abstraction
- Automatic backup and restore capabilities
- Cloud backup integration
- Cache invalidation strategies

### Security Features
- End-to-end encryption for communications
- Cryptographic identity management
- Secure key storage and derivation
- Digital signature support

## Conclusion

Totem UI represents a sophisticated attempt to create a comprehensive blockchain-based business management platform. The application demonstrates advanced React patterns, comprehensive blockchain integration, and a well-architected modular system designed for scalability and maintainability. The use of reactive programming patterns and the custom data storage layer shows careful consideration for real-time updates and data consistency across a distributed system. 